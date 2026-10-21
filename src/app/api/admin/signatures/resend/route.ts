import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createOpaqueToken, hashToken } from "@/lib/security/tokens";
import { sendSignatureInvitation } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let actor;
  try { actor = await requireRole("MANAGER"); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
  try {
    const body = await request.json() as { documentId?: unknown };
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { signers: true } });
    if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    if (!["PENDING_SIGNATURES", "PARTIALLY_SIGNED"].includes(doc.status)) return NextResponse.json({ error: "Ce document n'est pas en attente de signatures." }, { status: 409 });
    const pending = doc.signers.filter(s => s.status === "PENDING");
    if (!pending.length) return NextResponse.json({ error: "Aucun signataire en attente." }, { status: 409 });
    const results = [];
    for (const signer of pending) {
      const token = createOpaqueToken();
      await prisma.emailVerification.updateMany({ where: { signerId: signer.id, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: new Date() } });
      await prisma.documentSigner.update({ where: { id: signer.id }, data: { invitationTokenHash: hashToken(token), invitedAt: new Date() } });
      const base = process.env.APP_URL || new URL(request.url).origin;
      const url = new URL("/signatures", base); url.searchParams.set("token", token);
      try {
        await sendSignatureInvitation({ email: signer.email, fullName: signer.fullName, title: doc.title, reference: doc.reference, url: url.toString() });
        await prisma.signatureEvent.create({ data: { documentId: doc.id, signerId: signer.id, action: "INVITATION_SENT", documentHash: doc.contentHash, evidence: { channel: "email", resent: true } } });
        results.push({ email: signer.email, sent: true });
      } catch { results.push({ email: signer.email, sent: false }); }
    }
    await prisma.auditLog.create({ data: { actorId: actor.id, action: "DOCUMENT_SIGNATURE_INVITATIONS_RESENT", entityType: "Document", entityId: doc.id, metadata: { attempted: results.length, sent: results.filter(r => r.sent).length } } });
    return NextResponse.json({ results, ok: results.every(r => r.sent) }, { status: results.every(r => r.sent) ? 200 : 207 });
  } catch {
    return NextResponse.json({ error: "Impossible de renvoyer les invitations." }, { status: 500 });
  }
}
