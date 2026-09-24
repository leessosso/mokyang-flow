import { usersCol, withId } from "@/lib/store/collections";
import type { OfficerTitle, Role, ServingDutyKey, User } from "@/lib/types";

export async function getUserByEmail(email: string): Promise<User | null> {
  const snap = await usersCol.where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  return withId(snap.docs[0]);
}

export async function getUserById(id: string): Promise<User | null> {
  const doc = await usersCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function getUsersByIds(ids: string[]): Promise<Map<string, User>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, User>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      const user = await getUserById(id);
      if (user) map.set(id, user);
    }),
  );
  return map;
}

export async function listUsersByRole(role: Role): Promise<User[]> {
  const snap = await usersCol.where("role", "==", role).get();
  return snap.docs.map(withId).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function listAllUsers(): Promise<User[]> {
  const snap = await usersCol.get();
  return snap.docs.map(withId).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  officerTitle?: OfficerTitle | null;
}): Promise<User> {
  const ref = usersCol.doc();
  const user: Omit<User, "id"> = {
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role,
    officerTitle: data.officerTitle ?? null,
    createdAt: new Date().toISOString(),
  };
  await ref.set(user);
  return { id: ref.id, ...user };
}

export async function updateOfficerTitle(userId: string, officerTitle: OfficerTitle | null) {
  await usersCol.doc(userId).update({ officerTitle });
}

export async function updateServingDutyKeys(userId: string, servingDutyKeys: ServingDutyKey[]) {
  await usersCol.doc(userId).update({ servingDutyKeys });
}

/** 섬김·모임 배정 UI용 로그인 계정 (목사·관리자·가장). */
export async function listLoginUsersForServing(): Promise<User[]> {
  const snap = await usersCol.get();
  return snap.docs
    .map(withId)
    .filter((u) => u.role === "PASTOR" || u.role === "LEADER" || u.role === "ADMIN")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
