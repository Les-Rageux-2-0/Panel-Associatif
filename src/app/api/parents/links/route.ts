import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

// Parents only see their own requests; players only see requests concerning them;
// OWNER/ADMIN can review the complete queue from the admin panel.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const isAdmin = ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number]);
  const links = await prisma.parentPlayerLink.findMany({
    where: isAdmin ? {} : user.role === "PARENT" ? { parentId: user.id } : { playerId: user.id },
    include: {
      parent: { select: { id: true, name: true, email: true } },
      player: { select: { id: true, name: true, email: true, birthDate: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: isAdmin ? 500 : 100,
  });
  return NextResponse.json({ links, canReview: isAdmin });
}

// Only OWNER and ADMIN may approve/reject. Neither parent nor player can approve.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (user.role !== "PARENT") return NextResponse.json({ error: "Cette action est réservée aux comptes Parent." }, { status: 403 });
  try {
    const body = await request.json() as { playerEmail?: string; playerId?: string; relationship?: string };
    const email = body.playerEmail?.trim().toLowerCase();
    const player = body.playerId
      ? await prisma.user.findUnique({ where: { id: body.playerId } })
      : email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!player || player.id === user.id || player.status !== "ACTIVE") return NextResponse.json({ error: "Compte Joueur introuvable ou inactif." }, { status: 404 });
    if (player.role !== "MEMBER") return NextResponse.json({ error: "Le compte indiqué n'est pas un compte Joueur." }, { status: 400 });
    const relationship = (body.relationship || "representant_legal").slice(0, 80);
    const existing = await prisma.parentPlayerLink.findUnique({ where: { parentId_playerId: { parentId: user.id, playerId: player.id } } });
    if (existing?.status === "ACTIVE") return NextResponse.json({ error: "Ce rattachement est déjà actif." }, { status: 409 });
    const link = await prisma.parentPlayerLink.upsert({
      where: { parentId_playerId: { parentId: user.id, playerId: player.id } },
      create: { parentId: user.id, playerId: player.id, requestedById: user.id, relationship, status: "PENDING" },
      update: { requestedById: user.id, relationship, status: "PENDING", verifiedAt: null, verifiedById: null },
      include: { player: { select: { id: true, name: true, email: true } } },
    });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "PARENT_PLAYER_LINK_REQUESTED", entityType: "ParentPlayerLink", entityId: link.id, metadata: { playerId: player.id } } });
    return NextResponse.json({ link, message: "Demande envoyée. Elle doit être validée par un OWNER ou un ADMIN." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Impossible de créer la demande de rattachement." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
    return NextResponse.json({ error: "Seuls les grades OWNER et ADMIN peuvent valider ou refuser un rattachement." }, { status: 403 });
  }
  try {
    const body = await request.json() as { linkId?: string; decision?: "approve" | "reject" };
    if (!body.linkId || !["approve", "reject"].includes(body.decision || "")) return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
    const link = await prisma.parentPlayerLink.findUnique({ where: { id: body.linkId } });
    if (!link) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    if (link.status !== "PENDING") return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
    const status = body.decision === "approve" ? "ACTIVE" : "REJECTED";
    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.parentPlayerLink.updateMany({ where: { id: link.id, status: "PENDING" }, data: { status, verifiedById: user.id, verifiedAt: new Date() } });
      if (changed.count !== 1) throw new Error("ALREADY_PROCESSED");
      await tx.auditLog.create({ data: { actorId: user.id, action: body.decision === "approve" ? "PARENT_PLAYER_LINK_APPROVED" : "PARENT_PLAYER_LINK_REJECTED", entityType: "ParentPlayerLink", entityId: link.id, metadata: { parentId: link.parentId, playerId: link.playerId } } });
      return tx.parentPlayerLink.findUnique({ where: { id: link.id }, include: { parent: { select: { name: true, email: true } }, player: { select: { name: true, email: true } } } });
    });
    return NextResponse.json({ link: updated, message: status === "ACTIVE" ? "Rattachement approuvé." : "Demande refusée." });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_PROCESSED") return NextResponse.json({ error: "Cette demande vient d'être traitée par un autre administrateur." }, { status: 409 });
    return NextResponse.json({ error: "Impossible de traiter cette demande." }, { status: 500 });
  }
}
