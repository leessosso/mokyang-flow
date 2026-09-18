import { auth } from "@/auth";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export function isPastorOrAdmin(role: Role) {
  return role === Role.PASTOR || role === Role.ADMIN;
}

export async function leaderCanAccessMember(userId: string, memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { group: true },
  });
  if (!member?.group.currentLeaderId) return false;
  return member.group.currentLeaderId === userId;
}

export async function leaderCanAccessGroup(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  return group?.currentLeaderId === userId;
}
