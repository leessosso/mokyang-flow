import { auth } from "@/auth";
import { getGroupById, getMemberById } from "@/lib/store/groups";
import { getUserById } from "@/lib/store/users";
import { isPastorOrAdmin, type Role } from "@/lib/types";

export { isPastorOrAdmin };

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
  return getUserById(session.user.id);
}

/** 그 가족원이 속한 가족의 현재 가장인지 확인 (가족 보고 방 권한에도 그대로 쓰인다) */
export async function leaderCanAccessMember(userId: string, memberId: string) {
  const member = await getMemberById(memberId);
  if (!member) return false;
  const group = await getGroupById(member.groupId);
  if (!group?.currentLeaderId) return false;
  return group.currentLeaderId === userId;
}

export async function leaderCanAccessGroup(userId: string, groupId: string) {
  const group = await getGroupById(groupId);
  return group?.currentLeaderId === userId;
}

export type { Role };
