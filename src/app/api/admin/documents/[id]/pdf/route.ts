import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createObjectKey, uploadPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";

function pdfSafeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ");
}

function interpolate(template: string, values: Record<string, unknown>) {
  return template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_match, key: string) => {
    const value = values[key];
    if (value === undefined || value === null || value === "") return `[${key}]`;
    if (typeof value === "boolean") return value ? "Oui" : "Non";
    return String(value);
  });
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireRole("MANAGER");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? "Connexion requise." : "Accès réservé aux responsables." }, { status });
  }

  try {
    const { id } = await context.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: { template: true }
    });
    if (!document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    if (!document.template) return NextResponse.json({ error: "Ce document ne provient pas d'un modèle. Importer un PDF existant reste nécessaire pour ce document." }, { status: 409 });
    if (document.status !== "DRAFT") return NextResponse.json({ error: "Le PDF de modèle ne peut être généré que pour un brouillon. Toute modification ultérieure devra créer une nouvelle version." }, { status: 409 });

    const values = document.formData && typeof document.formData === "object" && !Array.isArray(document.formData)
      ? document.formData as Record<string, unknown>
      : {};
    const body = pdfSafeText(interpolate(document.template.bodyTemplate, values));
    const pdf = await PDFDocument.create();
    pdf.setTitle(pdfSafeText(document.title));
    pdf.setSubject(`Document ${document.reference} - Les Rageux 2.0`);
    pdf.setAuthor("Les Rageux 2.0");
    pdf.setCreator("Portail Les Rageux 2.0");
    pdf.setCreationDate(new Date());
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 52;
    const contentWidth = pageWidth - margin * 2;
    const bodySize = 10.5;
    const lineHeight = 15;
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    const addPage = () => {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    };
    const drawWrapped = (text: string, font: PDFFont, size: number, color = rgb(0.12, 0.12, 0.16), gapAfter = 0) => {
      const paragraphs = text.split(/\r?\n/);
      for (const paragraph of paragraphs) {
        const lines = wrapLine(pdfSafeText(paragraph), font, size, contentWidth);
        for (const line of lines) {
          if (y < margin + lineHeight) addPage();
          page.drawText(line, { x: margin, y, size, font, color });
          y -= lineHeight;
        }
        if (!paragraph) y -= lineHeight / 2;
      }
      y -= gapAfter;
    };

    page.drawText("LES RAGEUX 2.0", { x: margin, y, size: 10, font: bold, color: rgb(0.43, 0.27, 0.78) });
    y -= 28;
    for (const line of wrapLine(pdfSafeText(document.title), bold, 19, contentWidth)) {
      if (y < margin + 25) addPage();
      page.drawText(line, { x: margin, y, size: 19, font: bold, color: rgb(0.08, 0.08, 0.12) });
      y -= 25;
    }
    y -= 4;
    page.drawText(`Référence : ${document.reference}`, { x: margin, y, size: 10, font: bold, color: rgb(0.22, 0.22, 0.28) });
    y -= 16;
    page.drawText(`Créé le : ${document.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`, { x: margin, y, size: 9, font: regular, color: rgb(0.35, 0.35, 0.4) });
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.82, 0.8, 0.88) });
    y -= 24;
    drawWrapped(body, regular, bodySize, rgb(0.12, 0.12, 0.16), 18);
    if (y < margin + 55) addPage();
    page.drawLine({ start: { x: margin, y: margin + 28 }, end: { x: pageWidth - margin, y: margin + 28 }, thickness: 0.5, color: rgb(0.82, 0.8, 0.88) });
    page.drawText("BROUILLON - document non signé", { x: margin, y: margin + 12, size: 8, font: bold, color: rgb(0.65, 0.25, 0.25) });
    page.drawText(document.reference, { x: pageWidth - margin - bold.widthOfTextAtSize(document.reference, 8), y: margin + 12, size: 8, font: bold, color: rgb(0.35, 0.35, 0.4) });

    const bytes = await pdf.save();
    const buffer = Buffer.from(bytes);
    const key = createObjectKey("documents", `${document.reference}.pdf`);
    await uploadPrivateObject({ key, body: buffer, contentType: "application/pdf", contentLength: buffer.length });
    const contentHash = createHash("sha256").update(buffer).digest("hex");
    await prisma.$transaction(async tx => {
      await tx.document.update({ where: { id: document.id }, data: { pdfOriginalKey: key, contentHash } });
      await tx.auditLog.create({ data: {
        actorId: user.id,
        action: "DOCUMENT_DRAFT_PDF_GENERATED",
        entityType: "Document",
        entityId: document.id,
        metadata: { reference: document.reference, contentHash, templateVersion: document.templateVersion }
      } });
    });
    return NextResponse.json({ ok: true, reference: document.reference, contentHash });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Configuration Cloudflare R2 incomplète")) {
      return NextResponse.json({ error: "Le stockage privé R2 n'est pas configuré. Renseigne STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY et STORAGE_SECRET_KEY." }, { status: 503 });
    }
    return NextResponse.json({ error: "Impossible de générer le PDF. Vérifie la configuration R2 et les journaux serveur." }, { status: 500 });
  }
}
