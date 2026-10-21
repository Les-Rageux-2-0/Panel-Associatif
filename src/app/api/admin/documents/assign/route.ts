import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let actor;
  try { actor = await requireRole("MANAGER"); }
  catch (e) { const msg = e instanceof Error ? e.message : ""; return NextResponse.json({ error: msg === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé aux responsables." }, { status: msg === "UNAUTHENTICATED" ? 401 : 403 }); }
  try {
    const body = await request.json() as { documentId?: string; userIds?: string[] };
    const documentId = body.documentId;
    const userIds = [...new Set((body.userIds || []).filter((id): id is string => typeof id === "string" && id.length <= 30))];
    if (!documentId || userIds.length < 1 || userIds.length > 100) return NextResponse.json({ error: "Indiquez un document et entre 1 et 100 destinataires." }, { status: 400 });
    const document = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true, title: true } });
    if (!document) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    const users = await prisma.user.findMany({ where: { id: { in: userIds }, status: "ACTIVE" }, select: { id: true } });
    if (users.length !== userIds.length) return NextResponse.json({ error: "Un ou plusieurs comptes sont inexistants ou inactifs." }, { status: 400 });
    await prisma.$transaction(userIds.map(userId => prisma.documentRecipient.upsert({
      where: { documentId_userId: { documentId, userId } },
      create: { documentId, userId, assignedById: actor.id },
      update: { assignedById: actor.id }
    })));
    await prisma.auditLog.create({ data: { actorId: actor.id, action: "DOCUMENT_ASSIGNED_TO_USERS", entityType: "Document", entityId: documentId, metadata: { userIds } } });
    return NextResponse.json({ message: `Document attribué à ${userIds.length} compte(s).`, documentId, assignedCount: userIds.length });
  } catch { return NextResponse.json({ error: "Échec de l'attribution du document." }, { status: 500 }); }
}
