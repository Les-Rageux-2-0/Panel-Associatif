import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { downloadPrivateObject, uploadPrivateObject } from "@/lib/storage";
import { hashToken } from "@/lib/security/tokens";

export const CODE_TTL_MS = 72 * 60 * 60 * 1000;
export const SIGN_AFTER_VERIFY_MS = 15 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;

export function hashEmailCode(code: string, signerId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");
  return createHmac("sha256", secret).update(`${signerId}:${code}`).digest("hex");
}

export function safeCompareHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export async function getSignerByInvitationToken(token: string) {
  if (!token || token.length < 32 || token.length > 200) return null;
  return prisma.documentSigner.findFirst({
    where: { invitationTokenHash: hashToken(token) },
    include: { document: { include: { signers: { orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }] } } } }
  });
}

export function signerCanAct(signer: NonNullable<Awaited<ReturnType<typeof getSignerByInvitationToken>>>) {
  const doc = signer.document;
  if (signer.status !== "PENDING") return { ok: false, reason: "SIGNER_NOT_PENDING" } as const;
  if (!(["PENDING_SIGNATURES", "PARTIALLY_SIGNED"] as string[]).includes(doc.status)) return { ok: false, reason: "DOCUMENT_NOT_SIGNABLE" } as const;
  if (!doc.pdfOriginalKey || !doc.contentHash) return { ok: false, reason: "PDF_NOT_READY" } as const;
  const earlier = doc.signers.filter(s => s.signingOrder < signer.signingOrder);
  if (earlier.some(s => s.status !== "SIGNED")) return { ok: false, reason: "WAITING_FOR_PREVIOUS_SIGNERS" } as const;
  return { ok: true } as const;
}

export function requestAuditContext(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "";
  const secret = process.env.AUTH_SECRET ?? "";
  const ipHash = ip && secret ? createHash("sha256").update(`${secret}:${ip}`).digest("hex") : null;
  return {
    ipHash,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null
  };
}

function printable(value: string) {
  return value.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/\u00a0/g, " ");
}

export async function finalizeSignedDocument(documentId: string, actorId: string | null = null) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { signers: { orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }] } }
  });
  if (!document) throw new Error("DOCUMENT_NOT_FOUND");
  if (document.status === "SIGNED" && document.pdfFinalKey) return { alreadyFinalized: true, reference: document.reference };
  if (!document.pdfOriginalKey || !document.contentHash) throw new Error("SOURCE_PDF_MISSING");
  if (!document.signers.length || document.signers.some(s => s.status !== "SIGNED" || !s.signedAt)) throw new Error("SIGNATURES_INCOMPLETE");

  const sourceHash = document.contentHash;
  const sourceBytes = await downloadPrivateObject(document.pdfOriginalKey);
  const pdf = await PDFDocument.load(sourceBytes);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const lastPage = pages[pages.length - 1];
  if (lastPage) {
    const { width } = lastPage.getSize();
    lastPage.drawRectangle({ x: 35, y: 0, width: width - 70, height: 82, color: rgb(1, 1, 1) });
    lastPage.drawLine({ start: { x: 48, y: 55 }, end: { x: width - 48, y: 55 }, thickness: 0.7, color: rgb(0.78, 0.75, 0.84) });
    lastPage.drawText("DOCUMENT SIGNE ELECTRONIQUEMENT", { x: 48, y: 38, size: 8, font: bold, color: rgb(0.25, 0.16, 0.45) });
    const refWidth = bold.widthOfTextAtSize(document.reference, 8);
    lastPage.drawText(document.reference, { x: width - 48 - refWidth, y: 38, size: 8, font: bold, color: rgb(0.25, 0.25, 0.3) });
  }

  const certificate = pdf.addPage([595.28, 841.89]);
  const margin = 48;
  let y = 790;
  certificate.drawText("LES RAGEUX 2.0", { x: margin, y, size: 10, font: bold, color: rgb(0.42, 0.25, 0.76) });
  y -= 35;
  certificate.drawText("Attestation technique de signature", { x: margin, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.14) });
  y -= 30;
  certificate.drawText(`Document : ${printable(document.title).slice(0, 75)}`, { x: margin, y, size: 10, font: regular }); y -= 18;
  certificate.drawText(`Reference : ${document.reference}`, { x: margin, y, size: 10, font: bold }); y -= 18;
  certificate.drawText(`Empreinte SHA-256 du contenu presente a la signature :`, { x: margin, y, size: 9, font: regular }); y -= 14;
  certificate.drawText(sourceHash, { x: margin, y, size: 7, font: regular }); y -= 30;
  certificate.drawText("Signataires verifies par code a usage unique envoye par e-mail :", { x: margin, y, size: 10, font: bold }); y -= 24;

  for (const [index, signer] of document.signers.entries()) {
    const date = signer.signedAt?.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) ?? "Date indisponible";
    const lines = [
      `${index + 1}. ${printable(signer.fullName)} (${signer.role})`,
      `   E-mail : ${signer.email}`,
      `   Signature confirmee le : ${date}`
    ];
    for (const line of lines) {
      if (y < 90) break;
      certificate.drawText(line.slice(0, 110), { x: margin, y, size: 8.5, font: regular, color: rgb(0.18, 0.18, 0.22) });
      y -= 14;
    }
    y -= 8;
  }
  y = Math.max(y - 4, 65);
  certificate.drawLine({ start: { x: margin, y }, end: { x: 595.28 - margin, y }, thickness: 0.6, color: rgb(0.8, 0.78, 0.84) });
  certificate.drawText("Cette page est un journal technique des confirmations recueillies sur le portail.", { x: margin, y: y - 17, size: 8, font: regular, color: rgb(0.35, 0.35, 0.4) });
  certificate.drawText("Elle ne constitue pas, a elle seule, une certification qualifiee de signature electronique.", { x: margin, y: y - 30, size: 8, font: regular, color: rgb(0.35, 0.35, 0.4) });

  const finalBytes = Buffer.from(await pdf.save());
  const finalHash = createHash("sha256").update(finalBytes).digest("hex");
  const finalKey = `documents/final/${document.reference}.pdf`;
  await uploadPrivateObject({ key: finalKey, body: finalBytes, contentType: "application/pdf", contentLength: finalBytes.length });

  await prisma.$transaction(async tx => {
    const fresh = await tx.document.findUnique({ where: { id: document.id }, include: { signers: true } });
    if (!fresh) throw new Error("DOCUMENT_NOT_FOUND");
    if (fresh.status === "SIGNED" && fresh.pdfFinalKey) return;
    if (fresh.contentHash !== sourceHash || fresh.signers.some(s => s.status !== "SIGNED" || !s.signedAt)) throw new Error("DOCUMENT_CHANGED_DURING_FINALIZATION");
    await tx.document.update({ where: { id: document.id }, data: { status: "SIGNED", pdfFinalKey: finalKey, contentHash: finalHash, completedAt: new Date() } });
    await tx.auditLog.create({ data: {
      actorId,
      action: "DOCUMENT_FINAL_PDF_CREATED",
      entityType: "Document",
      entityId: document.id,
      metadata: { reference: document.reference, sourceHash, finalHash, signerCount: document.signers.length }
    } });
  });
  return { alreadyFinalized: false, reference: document.reference, finalHash };
}
