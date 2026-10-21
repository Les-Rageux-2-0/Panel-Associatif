import { NextResponse } from "next/server";
import type { SignerRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createOpaqueToken, hashToken } from "@/lib/security/tokens";
import { sendSignatureInvitation } from "@/lib/mail";

export const runtime = "nodejs";
const signerRoles = new Set<SignerRole>(["PLAYER", "RECRUITER", "ROSTER_MANAGER", "LEGAL_GUARDIAN", "TEAM_REPRESENTATIVE", "DONOR", "OTHER"]);

function inviteUrl(request: Request, token: string) {
  const base = process.env.APP_URL || new URL(request.url).origin;
  const url = new URL("/signatures", base);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function GET() {
  try {
    await requireRole("MANAGER");
    const documents = await prisma.document.findMany({
      where: { pdfOriginalKey: { not: null }, status: { in: ["DRAFT", "PENDING_SIGNATURES", "PARTIALLY_SIGNED"] } },
      orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, reference: true, title: true, status: true, createdAt: true, sentAt: true, signers: { orderBy: [{ signingOrder: "asc" }, { createdAt: "asc" }], select: { id: true, fullName: true, email: true, role: true, status: true, signingOrder: true, invitedAt: true, signedAt: true } } }
    });
    return NextResponse.json({ documents }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}

export async function POST(request: Request) {
  let actor;
  try { actor = await requireRole("MANAGER"); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: message === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: message === "UNAUTHENTICATED" ? 401 : 403 });
  }

  try {
    const body = await request.json() as { documentId?: unknown; signers?: unknown };
    const documentId = typeof body.documentId === "string" ? body.documentId.trim() : "";
    if (!documentId || !Array.isArray(body.signers) || body.signers.length < 1 || body.signers.length > 10) {
      return NextResponse.json({ error: "Sélectionne un document et entre 1 à 10 signataires." }, { status: 400 });
    }
    const input = body.signers.map((item: unknown) => {
      const v = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const fullName = typeof v.fullName === "string" ? v.fullName.trim().slice(0, 160) : "";
      const email = typeof v.email === "string" ? v.email.trim().toLowerCase().slice(0, 254) : "";
      const role = String(v.role ?? "OTHER") as SignerRole;
      const signingOrder = Number(v.signingOrder ?? 1);
      if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !signerRoles.has(role) || !Number.isInteger(signingOrder) || signingOrder < 1 || signingOrder > 10) throw new Error("SIGNER_INPUT_INVALID");
      return { fullName, email, role, signingOrder, token: createOpaqueToken() };
    });
    if (new Set(input.map(s => `${s.email}:${s.role}`)).size !== input.length) return NextResponse.json({ error: "Un même e-mail et rôle ne peuvent pas être ajoutés deux fois." }, { status: 400 });

    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { signers: true } });
    if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    if (doc.status !== "DRAFT" || !doc.pdfOriginalKey || !doc.contentHash) return NextResponse.json({ error: "Le document doit être un brouillon avec un PDF généré avant l'invitation." }, { status: 409 });
    if (doc.signers.length) return NextResponse.json({ error: "Des signataires existent déjà. Utilise la fonction de renvoi d'invitation." }, { status: 409 });

    const created = await prisma.$transaction(async tx => {
      const signers = [];
      for (const signer of input) {
        signers.push(await tx.documentSigner.create({ data: {
          documentId: doc.id, email: signer.email, fullName: signer.fullName, role: signer.role,
          signingOrder: signer.signingOrder, invitationTokenHash: hashToken(signer.token), invitedAt: new Date()
        }, select: { id: true, email: true, fullName: true, role: true, signingOrder: true } }));
      }
      await tx.document.update({ where: { id: doc.id }, data: { status: "PENDING_SIGNATURES", sentAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "DOCUMENT_SIGNATURES_INVITED", entityType: "Document", entityId: doc.id, metadata: { reference: doc.reference, signerCount: signers.length } } });
      return signers;
    });

    const results: { email: string; sent: boolean; signerId: string; error?: string }[] = [];
    for (let i = 0; i < created.length; i++) {
      const signer = created[i];
      try {
        await sendSignatureInvitation({ email: signer.email, fullName: signer.fullName, title: doc.title, reference: doc.reference, url: inviteUrl(request, input[i].token) });
        await prisma.signatureEvent.create({ data: { documentId: doc.id, signerId: signer.id, action: "INVITATION_SENT", documentHash: doc.contentHash, evidence: { channel: "email", reference: doc.reference } } });
        results.push({ email: signer.email, sent: true, signerId: signer.id });
      } catch {
        results.push({ email: signer.email, sent: false, signerId: signer.id, error: "E-mail non envoyé. Utilise le renvoi d'invitation après correction SMTP." });
      }
    }
    return NextResponse.json({ ok: results.every(r => r.sent), document: { id: doc.id, reference: doc.reference }, results }, { status: results.every(r => r.sent) ? 201 : 207 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SIGNER_INPUT_INVALID") return NextResponse.json({ error: "Un signataire contient un nom, e-mail, rôle ou ordre invalide." }, { status: 400 });
    return NextResponse.json({ error: "Impossible de préparer les signatures. Vérifie les données et la configuration SMTP." }, { status: 500 });
  }
}
