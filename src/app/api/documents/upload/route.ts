import { NextResponse } from "next/server";
import { randomUUID, createHash } from "node:crypto";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { uploadPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf"]);

export async function POST(request: Request) {
  let user;
  try {
    user = await requireRole("MANAGER");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim().slice(0, 200);
    const type = String(form.get("type") ?? "ACCOUNTING_LEDGER");
    const recipientUserIdsRaw = String(form.get("recipientUserIds") ?? "");
    const recipientUserIds = [...new Set(recipientUserIdsRaw.split(/[;,\s]+/).map(v => v.trim()).filter(Boolean))];
    if (recipientUserIds.length > 100) return NextResponse.json({ error: "Maximum 100 destinataires par document." }, { status: 400 });
    const allowedDocumentTypes = [
      "PLAYER_VOLUNTEER_ADULT", "ROSTER_CONTRACT", "RECRUITER_CONTRACT",
      "PLAYER_MINOR", "PARENTAL_AUTHORIZATION", "SUSPENSION_NOTICE",
      "DONATION_RECEIPT", "ACCOUNTING_LEDGER"
    ];
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type) || !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Le fichier doit peser entre 1 octet et 10 Mo." }, { status: 413 });
    if (!title) return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });
    if (!allowedDocumentTypes.includes(type)) return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    // Check PDF magic bytes rather than trusting only the browser MIME type.
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "Le fichier ne semble pas être un PDF valide." }, { status: 415 });

    const id = randomUUID();
    const key = `documents/${new Date().toISOString().slice(0, 10)}/${id}.pdf`;
    const hash = createHash("sha256").update(bytes).digest("hex");
    await uploadPrivateObject({ key, body: bytes, contentType: "application/pdf", contentLength: bytes.length });

    try {
      const year = new Date().getUTCFullYear();
      const documentType = type as import("@/generated/prisma/client").DocumentType;
      const prefixes: Record<string, string> = {
        PLAYER_VOLUNTEER_ADULT: "LR2-CJM",
        ROSTER_CONTRACT: "LR2-CRO",
        RECRUITER_CONTRACT: "LR2-REC",
        PLAYER_MINOR: "LR2-CJMINEUR",
        PARENTAL_AUTHORIZATION: "LR2-APM",
        SUSPENSION_NOTICE: "LR2-MAP",
        DONATION_RECEIPT: "LR2-RDO",
        ACCOUNTING_LEDGER: "LR2-CTC"
      };
      const doc = await prisma.$transaction(async (tx) => {
        // L'upsert incrémente la ligne unique du type/année : les créations simultanées
        // ne peuvent pas recevoir le même numéro.
        const counterId = `${year}_${type}`;
        await tx.documentNumberCounter.upsert({
          where: { id: counterId },
          create: { id: counterId, year, type: documentType, currentValue: 1 },
          update: { currentValue: { increment: 1 } }
        });
        const counter = await tx.documentNumberCounter.findUniqueOrThrow({ where: { id: counterId } });
        const reference = `${prefixes[type]}-${year}-${String(counter.currentValue).padStart(6, "0")}`;
        return tx.document.create({
          data: {
            type: documentType,
            title,
            reference,
            createdById: user.id,
            formData: { uploadedFile: true, originalName: file.name.slice(0, 180), size: bytes.length },
            pdfOriginalKey: key,
            contentHash: hash,
            status: "DRAFT"
          },
          select: { id: true, reference: true, title: true, type: true, status: true, createdAt: true }
        });
      });
      if (recipientUserIds.length) {
        const recipients = await prisma.user.findMany({ where: { id: { in: recipientUserIds }, status: "ACTIVE" }, select: { id: true } });
        if (recipients.length !== recipientUserIds.length) throw new Error("RECIPIENT_INVALID");
        await prisma.$transaction(recipients.map(recipient => prisma.documentRecipient.create({ data: { documentId: doc.id, userId: recipient.id, assignedById: user.id } })));
      }
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "DOCUMENT_PDF_UPLOADED",
          entityType: "Document",
          entityId: doc.id,
          metadata: { key, size: bytes.length, sha256: hash }
        }
      });
      return NextResponse.json({ document: doc }, { status: 201 });
    } catch (dbError) {
      // Avoid orphaned private objects if the database insert fails.
      const { deletePrivateObject } = await import("@/lib/storage");
      await deletePrivateObject(key).catch(() => undefined);
      throw dbError;
    }
  } catch {
    return NextResponse.json({ error: "Le téléversement a échoué. Vérifiez la base de données et la configuration R2." }, { status: 500 });
  }
}
