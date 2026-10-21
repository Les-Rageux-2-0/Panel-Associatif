import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignerByInvitationToken, hashEmailCode, requestAuditContext, safeCompareHex, signerCanAct } from "@/lib/signatures";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: unknown; code?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Saisis le code à 6 chiffres reçu par e-mail." }, { status: 400 });
    const signer = await getSignerByInvitationToken(token);
    if (!signer) return NextResponse.json({ error: "Lien d'invitation invalide ou révoqué." }, { status: 404 });
    const eligibility = signerCanAct(signer);
    if (!eligibility.ok) return NextResponse.json({ error: "Ce document ne peut pas être signé actuellement." }, { status: 409 });

    const now = new Date();
    const verification = await prisma.emailVerification.findFirst({ where: { signerId: signer.id, consumedAt: null, invalidatedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" } });
    if (!verification) return NextResponse.json({ error: "Aucun code valide. Demande un nouveau code par e-mail." }, { status: 400 });
    const claimed = await prisma.emailVerification.updateMany({ where: { id: verification.id, consumedAt: null, invalidatedAt: null, expiresAt: { gt: now }, attempts: { lt: verification.maxAttempts } }, data: { attempts: { increment: 1 } } });
    if (claimed.count !== 1) return NextResponse.json({ error: "Ce code est expiré ou le nombre de tentatives est atteint." }, { status: 400 });

    const expected = hashEmailCode(code, signer.id);
    if (!safeCompareHex(expected, verification.codeHash)) {
      const after = await prisma.emailVerification.findUnique({ where: { id: verification.id }, select: { attempts: true, maxAttempts: true } });
      if (after && after.attempts >= after.maxAttempts) await prisma.emailVerification.update({ where: { id: verification.id }, data: { invalidatedAt: new Date() } });
      return NextResponse.json({ error: after && after.attempts >= after.maxAttempts ? "Trop de tentatives. Demande un nouveau code." : "Code incorrect." }, { status: 400 });
    }
    const consumed = await prisma.emailVerification.updateMany({ where: { id: verification.id, consumedAt: null, invalidatedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) return NextResponse.json({ error: "Ce code a déjà été utilisé." }, { status: 409 });
    const context = requestAuditContext(request);
    const event = await prisma.signatureEvent.create({ data: {
      documentId: signer.documentId, signerId: signer.id, action: "CODE_VERIFIED", documentHash: signer.document.contentHash,
      ipHash: context.ipHash, userAgent: context.userAgent, evidence: { verificationId: verification.id, method: "email_one_time_code", expiresAt: verification.expiresAt.toISOString() }
    } });
    return NextResponse.json({ ok: true, verifiedAt: event.occurredAt, signingWindowMinutes: 15, message: "Code vérifié. Confirme maintenant explicitement ta signature dans les 15 minutes." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Impossible de vérifier le code. Réessaie ou demande un nouveau code." }, { status: 500 });
  }
}
