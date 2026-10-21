import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const runtime = "nodejs";
const roles = ["OWNER", "ADMIN", "MANAGER", "RECRUITER", "MEMBER", "PARENT", "ACCOUNTANT"] as const;
const statuses = ["PENDING", "ACTIVE", "SUSPENDED", "DISABLED"] as const;

// Changement des rôles/statuts réservé à l'administration; personne ne peut s'auto-promouvoir.
export async function PATCH(request: Request) {
  let actor;
  try { actor = await requireRole("ADMIN"); }
  catch (e) { const msg = e instanceof Error ? e.message : ""; return NextResponse.json({ error: msg === "UNAUTHENTICATED" ? "Connexion requise." : "Accès réservé à l'administration." }, { status: msg === "UNAUTHENTICATED" ? 401 : 403 }); }
  try {
    const body = await request.json() as { userId?: string; role?: string; status?: string };
    if (!body.userId || (!roles.includes(body.role as typeof roles[number]) && !statuses.includes(body.status as typeof statuses[number]))) return NextResponse.json({ error: "Utilisateur, rôle ou statut invalide." }, { status: 400 });
    if (actor.role !== "OWNER" && body.role === "OWNER") return NextResponse.json({ error: "Seul le Owner peut attribuer le rôle Owner." }, { status: 403 });
    if (body.userId === actor.id && body.role && body.role !== actor.role) return NextResponse.json({ error: "Vous ne pouvez pas modifier votre propre rôle." }, { status: 403 });
    const data: { role?: typeof roles[number]; status?: typeof statuses[number] } = {};
    if (body.role) data.role = body.role as typeof roles[number];
    if (body.status) data.status = body.status as typeof statuses[number];
    const target = await prisma.user.update({ where: { id: body.userId }, data, select: { id: true, name: true, email: true, role: true, status: true } });
    await prisma.auditLog.create({ data: { actorId: actor.id, action: "USER_ROLE_OR_STATUS_UPDATED", entityType: "User", entityId: target.id, metadata: data } });
    return NextResponse.json({ user: target });
  } catch { return NextResponse.json({ error: "Utilisateur introuvable ou mise à jour impossible." }, { status: 400 }); }
}
