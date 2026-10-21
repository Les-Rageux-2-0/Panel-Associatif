import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { DocumentType } from "@/generated/prisma/client";

export const runtime = "nodejs";

const documentTypes = new Set<DocumentType>([
  "PLAYER_VOLUNTEER_ADULT", "ROSTER_CONTRACT", "RECRUITER_CONTRACT",
  "PLAYER_MINOR", "PARENTAL_AUTHORIZATION", "SUSPENSION_NOTICE",
  "DONATION_RECEIPT", "ACCOUNTING_LEDGER"
]);

type TemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "email" | "date" | "number" | "checkbox";
  required: boolean;
};

function normalizeFields(value: unknown): TemplateField[] | null {
  if (!Array.isArray(value) || value.length > 80) return null;
  const keys = new Set<string>();
  const fields: TemplateField[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const field = item as Record<string, unknown>;
    const key = typeof field.key === "string" ? field.key.trim() : "";
    const label = typeof field.label === "string" ? field.label.trim() : "";
    const type = field.type;
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(key) || !label || label.length > 120) return null;
    if (!["text", "textarea", "email", "date", "number", "checkbox"].includes(String(type))) return null;
    if (keys.has(key)) return null;
    keys.add(key);
    fields.push({ key, label, type: type as TemplateField["type"], required: field.required === true });
  }
  return fields;
}

export async function GET() {
  try {
    await requireRole("MANAGER");
    const templates = await prisma.documentTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, type: true, name: true, description: true, version: true, fields: true, bodyTemplate: true, createdAt: true }
    });
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("MANAGER");
    const body = await request.json() as Record<string, unknown>;
    const type = String(body.type ?? "") as DocumentType;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 180) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
    const bodyTemplate = typeof body.bodyTemplate === "string" ? body.bodyTemplate.trim() : "";
    const fields = normalizeFields(body.fields);
    if (!documentTypes.has(type)) return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
    if (!name || !bodyTemplate) return NextResponse.json({ error: "Le nom et le contenu du modèle sont obligatoires." }, { status: 400 });
    if (bodyTemplate.length > 50000) return NextResponse.json({ error: "Le contenu du modèle dépasse 50 000 caractères." }, { status: 413 });
    if (!fields) return NextResponse.json({ error: "La liste des champs est invalide. Vérifie les clés, types et doublons." }, { status: 400 });

    const created = await prisma.$transaction(async tx => {
      const latest = await tx.documentTemplate.findFirst({ where: { type }, orderBy: { version: "desc" }, select: { version: true } });
      const version = (latest?.version ?? 0) + 1;
      const template = await tx.documentTemplate.create({
        data: { type, name, description: description || null, version, fields: fields as never, bodyTemplate, createdById: user.id },
        select: { id: true, type: true, name: true, description: true, version: true, createdAt: true }
      });
      await tx.auditLog.create({ data: { actorId: user.id, action: "DOCUMENT_TEMPLATE_CREATED", entityType: "DocumentTemplate", entityId: template.id, metadata: { type, version, fieldCount: fields.length } } });
      return template;
    });
    return NextResponse.json({ template: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Connexion requise." : status === 403 ? "Accès réservé aux responsables." : "Impossible de créer le modèle." }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole("MANAGER");
    const body = await request.json() as { templateId?: string; action?: string };
    if (!body.templateId || body.action !== "ARCHIVE") return NextResponse.json({ error: "Action ou modèle invalide." }, { status: 400 });
    const template = await prisma.documentTemplate.findUnique({ where: { id: body.templateId }, select: { id: true, name: true, isActive: true } });
    if (!template || !template.isActive) return NextResponse.json({ error: "Ce modèle n’est plus actif." }, { status: 404 });
    await prisma.documentTemplate.update({ where: { id: template.id }, data: { isActive: false } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "DOCUMENT_TEMPLATE_ARCHIVED", entityType: "DocumentTemplate", entityId: template.id, metadata: { name: template.name } } });
    return NextResponse.json({ ok: true, name: template.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Connexion requise." : status === 403 ? "Accès réservé aux responsables." : "Archivage impossible." }, { status });
  }
}
