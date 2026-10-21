import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { User, UserRole } from "@/generated/prisma/client";

const COOKIE_NAME = "rageux_session";
const SESSION_DAYS = 14;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.authSession.create({
    data: { tokenHash: hash(token), userId, expiresAt }
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hash(token) } });
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<Pick<User, "id" | "email" | "name" | "role" | "status"> | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true }
  });
  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    if (session) await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    cookieStore.delete(COOKIE_NAME);
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    status: session.user.status
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

const roleRank: Record<UserRole, number> = {
  OWNER: 100, ADMIN: 90, MANAGER: 70, ACCOUNTANT: 60, RECRUITER: 40, MEMBER: 10, PARENT: 10
};

export async function requireRole(minimum: UserRole) {
  const user = await requireUser();
  if (roleRank[user.role] < roleRank[minimum]) throw new Error("FORBIDDEN");
  return user;
}
