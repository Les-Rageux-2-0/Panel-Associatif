import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmailCode } from "@/lib/security/tokens";
import { sendVerificationCode } from "@/lib/mail";
import { CODE_TTL_MS, getSignerByInvitationToken, hashEmailCode, signerCanAct } from "@/lib/signatures";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: unknown };
    const token = typeof body.token === "string" ? body.token : "";
    const signer = await getSignerByInvitationToken(token);
    if (!signer) return NextResponse.json({ error: "Lien d'invitation invalide ou révoqué." }, { status: 404 });
    const eligibility = signerCanAct(signer);
    if (!eligibility.ok) return NextResponse.json({ error: eligibility.reason === "WAITING_FOR_PREVIOUS_SIGNERS" ? "Le signataire précédent doit signer avant vous." : "Ce document ne peut pas être signé actuellement." }, { status: 409 });

    const now = new Date();
    const recent = await prisma.emailVerification.findMany({ where: { signerId: signer.id, createdAt: { gt: new Date(now.getTime() - 15 * 60 * 1000) } }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, createdAt: true } });
    if (recent.length >= 3) return NextResponse.json({ error: "Limite atteinte : demande au maximum 3 codes en 15 minutes." }, { status: 429 });
    const latest = recent[0];
    if (latest && now.getTime() - latest.createdAt.getTime() < 60_000) return NextResponse.json({ error: "Attends une minute avant de demander un nouveau code." }, { status: 429 });

    await prisma.emailVerification.updateMany({ where: { signerId: signer.id, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
    const code = createEmailCode();
    const verification = await prisma.emailVerification.create({ data: {
      signerId: signer.id,
      codeHash: hashEmailCode(code, signer.id),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      maxAttempts: 5
    } });
    try {
      await sendVerificationCode(signer.email, code, signer.document.reference);
    } catch {
      await prisma.emailVerification.update({ where: { id: verification.id }, data: { invalidatedAt: new Date() } }).catch(() => undefined);
      return NextResponse.json({ error: "Impossible d'envoyer le code. Vérifie la configuration SMTP puis réessaie." }, { status: 503 });
    }
    await prisma.auditLog.create({ data: { actorId: null, action: "SIGNATURE_CODE_SENT", entityType: "DocumentSigner", entityId: signer.id, metadata: { reference: signer.document.reference, expiresAt: verification.expiresAt.toISOString(), channel: "email" } } }).catch(() => undefined);
    return NextResponse.json({ ok: true, expiresAt: verification.expiresAt, message: "Un code a été envoyé à l'adresse e-mail associée à l'invitation." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Impossible de demander un code de signature. Vérifie AUTH_SECRET et la base de données." }, { status: 500 });
  }
}
