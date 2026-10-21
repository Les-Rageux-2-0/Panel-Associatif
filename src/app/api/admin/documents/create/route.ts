import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { DocumentType } from "@/generated/prisma/client";

export const runtime = "nodejs";

const prefixes: Record<DocumentType, string> = {
  PLAYER_VOLUNTEER_ADULT: "LR2-CJM",
  ROSTER_CONTRACT: "LR2-CRO",
  RECRUITER_CONTRACT: "LR2-REC",
  PLAYER_MINOR: "LR2-CJMINEUR",
  PARENTAL_AUTHORIZATION: "LR2-APM",
  SUSPENSION_NOTICE: "LR2-MAP",
  DONATION_RECEIPT: "LR2-RDO",
  ACCOUNTING_LEDGER: "LR2-CTC"
};

type Field = { key: string; label: string; type: string; required: boolean };

export async function POST(request: Request) {
  try {
    const user = await requireRole("MANAGER");
    const body = await request.json() as Record<string, unknown>;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const titleInput = typeof body.title === "string" ? body.title.trim() : "";
    const values = body.values && typeof body.values === "object" && !Array.isArray(body.values) ? body.values as Record<string, unknown> : {};
    const recipientRaw = typeof body.recipientUserIds === "string" ? body.recipientUserIds : "";
    const recipientUserIds = [...new Set(recipientRaw.split(/[;,\s]+/).map(v => v.trim()).filter(Boolean))];
    if (!templateId) return NextResponse.json({ error: "Sélectionne un modèle." }, { status: 400 });
    if (recipientUserIds.length > 100) return NextResponse.json({ error: "Maximum 100 destinataires par document." }, { status: 400 });

    const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, isActive: true } });
    if (!template) return NextResponse.json({ error: "Modèle introuvable ou désactivé." }, { status: 404 });
    const fields = Array.isArray(template.fields) ? template.fields as unknown as Field[] : [];
    const cleanedValues: Record<string, string | number | boolean> = {};
    for (const field of fields) {
      const raw = values[field.key];
      let value: string | number | boolean = "";
      if (field.type === "checkbox") value = raw === true || raw === "true";
      else if (typeof raw === "string" || typeof raw === "number") value = String(raw).trim().slice(0, 5000);
      if (field.required && (value === "" || value === false)) {
        return NextResponse.json({ error: `Le champ « ${field.label} » est obligatoire.` }, { status: 400 });
      }
      if (field.type === "email" && value && typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return NextResponse.json({ error: `L'adresse e-mail du champ « ${field.label} » est invalide.` }, { status: 400 });
      }
      if (field.type === "number" && value !== "" && (typeof value !== "string" || !Number.isFinite(Number(value)))) {
        return NextResponse.json({ error: `Le champ « ${field.label} » doit être numérique.` }, { status: 400 });
      }
      cleanedValues[field.key] = value;
    }
    for (const key of Object.keys(values)) {
      if (!fields.some(field => field.key === key)) return NextResponse.json({ error: "Le formulaire contient un champ inconnu." }, { status: 400 });
    }

    const title = (titleInput || template.name).slice(0, 200);
    const year = new Date().getUTCFullYear();
    const created = await prisma.$transaction(async tx => {
      if (recipientUserIds.length) {
        const active = await tx.user.findMany({ where: { id: { in: recipientUserIds }, status: "ACTIVE" }, select: { id: true } });
        if (active.length !== recipientUserIds.length) throw new Error("RECIPIENT_INVALID");
      }
      const counterId = `${year}_${template.type}`;
      await tx.documentNumberCounter.upsert({
        where: { id: counterId },
        create: { id: counterId, year, type: template.type, currentValue: 1 },
        update: { currentValue: { increment: 1 } }
      });
      const counter = await tx.documentNumberCounter.findUniqueOrThrow({ where: { id: counterId } });
      const reference = `${prefixes[template.type]}-${year}-${String(counter.currentValue).padStart(6, "0")}`;
      const document = await tx.document.create({
        data: {
          type: template.type,
          status: "DRAFT",
          title,
          reference,
          templateId: template.id,
          templateVersion: template.version,
          createdById: user.id,
          formData: cleanedValues as never
        },
        select: { id: true, reference: true, title: true, type: true, status: true, createdAt: true }
      });
      if (recipientUserIds.length) {
        await tx.documentRecipient.createMany({ data: recipientUserIds.map(userId => ({ documentId: document.id, userId, assignedById: user.id })) });
      }
      await tx.auditLog.create({ data: { actorId: user.id, action: "DOCUMENT_CREATED_FROM_TEMPLATE", entityType: "Document", entityId: document.id, metadata: { reference, templateId: template.id, templateVersion: template.version, recipientCount: recipientUserIds.length } } });
      return document;
    });
    return NextResponse.json({ document: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "RECIPIENT_INVALID") return NextResponse.json({ error: "Un ou plusieurs destinataires sont introuvables ou inactifs." }, { status: 400 });
    const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Connexion requise." : status === 403 ? "Accès réservé aux responsables." : "Impossible de créer le document. Vérifie la base de données." }, { status });
  }
}
