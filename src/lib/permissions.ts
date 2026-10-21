import type { UserRole } from "@/generated/prisma/client";

const roleRank: Record<UserRole, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  ACCOUNTANT: 50,
  RECRUITER: 40,
  MEMBER: 20,
  PARENT: 10,
};

export function hasMinimumRole(role: UserRole, minimum: UserRole) {
  return roleRank[role] >= roleRank[minimum];
}
