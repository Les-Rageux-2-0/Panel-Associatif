import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeSignedDocument, getSignerByInvitationToken, requestAuditContext, SIGN_AFTER_VERIFY_MS, signerCanAct } from "@/lib/signatures";

export const runtime = "nodejs";
const CONSENT_TEXT = "Je confirme avoir consulté le document référencé, comprendre que cette action vaut manifestation de mon intention de le signer électroniquement, et accepter l'enregistrement de la preuve de vérification par code e-mail.";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: unknown; consent?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    if (body.consent !== true) return NextResponse.json({ error: "Le consentement explicite est obligatoire pour signer." }, { status: 400 });
    const signer = await getSignerByInvitationToken(token);
    if (!signer) return NextResponse.json({ error: "Lien d'invitation invalide ou révoqué." }, { status: 404 });
    const eligibility = signerCanAct(signer);
    if (!eligibility.ok) return NextResponse.json({ error: eligibility.reason === "WAITING_FOR_PREVIOUS_SIGNERS" ? "Le signataire précédent doit signer avant vous." : "Ce document ne peut pas être signé actuellement." }, { status: 409 });
    const sourceHash = signer.document.contentHash;
    const verified = await prisma.signatureEvent.findFirst({ where: {
      signerId: signer.id, documentId: signer.documentId, action: "CODE_VERIFIED", documentHash: sourceHash,
      occurredAt: { gt: new Date(Date.now() - SIGN_AFTER_VERIFY_MS) }
    }, orderBy: { occurredAt: "desc" } });
    if (!verified) return NextResponse.json({ error: "Vérifie d'abord ton code e-mail. La validation est valable 15 minutes." }, { status: 400 });
    const evidence = verified.evidence && typeof verified.evidence === "object" ? verified.evidence as Record<string, unknown> : {};
    const verificationId = typeof evidence.verificationId === "string" ? evidence.verificationId : "";
    const latestVerification = await prisma.emailVerification.findFirst({ where: { signerId: signer.id }, orderBy: { createdAt: "desc" } });
    if (!verificationId || !latestVerification || latestVerification.id !== verificationId || !latestVerification.consumedAt || latestVerification.invalidatedAt || latestVerification.expiresAt <= new Date()) {
      return NextResponse.json({ error: "La vérification n'est plus valide. Demande et vérifie un nouveau code." }, { status: 400 });
    }

    const context = requestAuditContext(request);
    const outcome = await prisma.$transaction(async tx => {
      const current = await tx.documentSigner.findUnique({ where: { id: signer.id }, include: { document: { include: { signers: true } } } });
      if (!current || current.status !== "PENDING" || current.document.contentHash !== sourceHash || !["PENDING_SIGNATURES", "PARTIALLY_SIGNED"].includes(current.document.status)) throw new Error("SIGNATURE_STATE_CHANGED");
      if (current.document.signers.some(s => s.signingOrder < current.signingOrder && s.status !== "SIGNED")) throw new Error("WAITING_FOR_PREVIOUS_SIGNERS");
      const stillVerified = await tx.signatureEvent.findFirst({ where: { id: verified.id, signerId: current.id, action: "CODE_VERIFIED", documentHash: sourceHash, occurredAt: { gt: new Date(Date.now() - SIGN_AFTER_VERIFY_MS) } }, select: { id: true } });
      const stillLatestVerification = await tx.emailVerification.findFirst({ where: { id: verificationId, signerId: current.id, consumedAt: { not: null }, invalidatedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
      if (!stillVerified || !stillLatestVerification) throw new Error("VERIFICATION_EXPIRED");
      const now = new Date();
      await tx.signatureEvent.create({ data: { documentId: current.documentId, signerId: current.id, action: "CONSENT_GIVEN", occurredAt: now, ipHash: context.ipHash, userAgent: context.userAgent, documentHash: sourceHash, evidence: { consentText: CONSENT_TEXT, consentVersion: "2026-01", verifiedEventId: verified.id } } });
      await tx.signatureEvent.create({ data: { documentId: current.documentId, signerId: current.id, action: "SIGNED", occurredAt: now, ipHash: context.ipHash, userAgent: context.userAgent, documentHash: sourceHash, evidence: { method: "email_one_time_code", verifiedEventId: verified.id, consentVersion: "2026-01" } } });
      await tx.documentSigner.update({ where: { id: current.id }, data: { status: "SIGNED", signedAt: now } });
      const remaining = await tx.documentSigner.count({ where: { documentId: current.documentId, status: { not: "SIGNED" } } });
      await tx.document.update({ where: { id: current.documentId }, data: { status: "PARTIALLY_SIGNED" } });
      await tx.auditLog.create({ data: { actorId: current.userId, action: "DOCUMENT_SIGNED_ELECTRONICALLY", entityType: "Document", entityId: current.documentId, metadata: { reference: current.document.reference, signerId: current.id, documentHash: sourceHash } } });
      return { allSigned: remaining === 0, documentId: current.documentId, reference: current.document.reference };
    });

    const allSignedNow = outcome.allSigned || (await prisma.documentSigner.count({ where: { documentId: outcome.documentId, status: { not: "SIGNED" } } })) === 0;
    if (allSignedNow) {
      try {
        const finalized = await finalizeSignedDocument(outcome.documentId, signer.userId ?? null);
        return NextResponse.json({ ok: true, completed: true, reference: outcome.reference, finalPdfReady: true, finalHash: finalized.finalHash ?? null });
      } catch {
        return NextResponse.json({ ok: true, completed: true, reference: outcome.reference, finalPdfReady: false, message: "Signature enregistrée. La génération du PDF final doit être relancée par un responsable." }, { status: 202 });
      }
    }
    return NextResponse.json({ ok: true, completed: false, reference: outcome.reference, message: "Signature enregistrée. Les autres signataires doivent terminer leur parcours." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "WAITING_FOR_PREVIOUS_SIGNERS") return NextResponse.json({ error: "Le signataire précédent doit signer avant vous." }, { status: 409 });
    if (message === "VERIFICATION_EXPIRED") return NextResponse.json({ error: "La vérification a expiré. Demande et vérifie un nouveau code." }, { status: 400 });
    if (message === "SIGNATURE_STATE_CHANGED") return NextResponse.json({ error: "Le document ou le statut de signature a changé. Recharge la page." }, { status: 409 });
    return NextResponse.json({ error: "Impossible d'enregistrer la signature. Recharge la page et réessaie." }, { status: 500 });
  }
}
