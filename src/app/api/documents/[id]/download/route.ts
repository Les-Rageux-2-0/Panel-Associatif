import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createPrivateDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

    // Members can only access documents they created or are explicitly assigned to sign.
    const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(user.role) || (user.role === "ACCOUNTANT" && doc.type === "ACCOUNTING_LEDGER");
    if (!canManage && doc.createdById !== user.id) {
      const directAccess = await prisma.documentRecipient.findFirst({ where: { documentId: doc.id, userId: user.id }, select: { id: true } });
      const signerAccess = await prisma.documentSigner.findFirst({ where: { documentId: doc.id, OR: [{ userId: user.id }, { email: user.email }] }, select: { id: true } });
      let parentAccess = false;
      if (user.role === "PARENT") {
        const linkedPlayers = await prisma.parentPlayerLink.findMany({ where: { parentId: user.id, status: "ACTIVE" }, select: { playerId: true } });
        if (linkedPlayers.length) {
          const playerIds = linkedPlayers.map(link => link.playerId);
          const playerAssignment = await prisma.documentRecipient.findFirst({ where: { documentId: doc.id, userId: { in: playerIds } }, select: { id: true } });
          const playerSigner = await prisma.documentSigner.findFirst({ where: { documentId: doc.id, userId: { in: playerIds } }, select: { id: true } });
          parentAccess = Boolean(playerAssignment || playerSigner) && ["PLAYER_MINOR", "PARENTAL_AUTHORIZATION", "ROSTER_CONTRACT"].includes(doc.type);
        }
      }
      if (!directAccess && !signerAccess && !parentAccess) return NextResponse.json({ error: "Accès interdit." }, { status: 403 });
    }

    const key = doc.pdfFinalKey ?? doc.pdfOriginalKey;
    if (!key) return NextResponse.json({ error: "Aucun PDF n'est disponible pour ce document." }, { status: 404 });
    const url = await createPrivateDownloadUrl(key, 120, `${doc.reference}.pdf`);
    return NextResponse.json({ url, expiresInSeconds: 120 });
  } catch {
    return NextResponse.json({ error: "Impossible de préparer le téléchargement." }, { status: 500 });
  }
}
