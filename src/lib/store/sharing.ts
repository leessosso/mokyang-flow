import {
  sharingAssignmentsCol,
  sharingGroupsCol,
  sharingPlansCol,
  withId,
} from "@/lib/store/collections";
import { listAllMembers, listGroups } from "@/lib/store/groups";
import type { SharingAssignment, SharingGroup, SharingPlan } from "@/lib/types";

export async function getPlanByMeeting(meetingId: string): Promise<SharingPlan | null> {
  const snap = await sharingPlansCol.where("meetingId", "==", meetingId).limit(1).get();
  if (snap.empty) return null;
  return withId(snap.docs[0]);
}

export async function getPlanById(id: string): Promise<SharingPlan | null> {
  const doc = await sharingPlansCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

async function upsertPlan(
  meetingId: string,
  serviceDate: string,
  useHomeGroups: boolean,
): Promise<SharingPlan> {
  const existing = await getPlanByMeeting(meetingId);
  if (existing) {
    await sharingPlansCol.doc(existing.id).update({ serviceDate, useHomeGroups });
    return { ...existing, serviceDate, useHomeGroups };
  }
  const ref = sharingPlansCol.doc();
  const plan: Omit<SharingPlan, "id"> = { meetingId, serviceDate, useHomeGroups };
  await ref.set(plan);
  return { id: ref.id, ...plan };
}

export async function listSharingGroupsByPlan(planId: string): Promise<SharingGroup[]> {
  const snap = await sharingGroupsCol.where("planId", "==", planId).get();
  return snap.docs.map(withId).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function listAssignmentsBySharingGroup(
  sharingGroupId: string,
): Promise<SharingAssignment[]> {
  const snap = await sharingAssignmentsCol.where("sharingGroupId", "==", sharingGroupId).get();
  return snap.docs.map(withId);
}

async function clearPlanGroups(planId: string) {
  const groups = await listSharingGroupsByPlan(planId);
  await Promise.all(
    groups.map(async (g) => {
      const assignments = await listAssignmentsBySharingGroup(g.id);
      await Promise.all(assignments.map((a) => sharingAssignmentsCol.doc(a.id).delete()));
      await sharingGroupsCol.doc(g.id).delete();
    }),
  );
}

/** 균형 잡힌 임시 나눔 조 자동 배치 (조별 인원 수 균등화), 또는 본조 고정 */
export async function autoSuggestSharingGroups(
  meetingId: string,
  serviceDate: string,
  useHomeGroups: boolean,
  groupCount: number,
): Promise<SharingPlan> {
  const plan = await upsertPlan(meetingId, serviceDate, useHomeGroups);
  await clearPlanGroups(plan.id);

  if (useHomeGroups) {
    const groups = await listGroups();
    for (const g of groups) {
      const membersOfGroup = (await listAllMembers()).filter((m) => m.groupId === g.id);
      const ref = sharingGroupsCol.doc();
      await ref.set({ planId: plan.id, name: `${g.name} (본조)`, homeGroupId: g.id });
      await Promise.all(
        membersOfGroup.map((m) =>
          sharingAssignmentsCol.doc().set({ sharingGroupId: ref.id, memberId: m.id }),
        ),
      );
    }
    return plan;
  }

  const members = await listAllMembers();
  const shuffled = [...members].sort(() => Math.random() - 0.5);
  const count = Math.max(2, Math.min(groupCount, shuffled.length || 2));

  const groupRefs = Array.from({ length: count }, (_, i) => ({
    ref: sharingGroupsCol.doc(),
    name: `나눔조 ${i + 1}`,
  }));
  await Promise.all(
    groupRefs.map(({ ref, name }) => ref.set({ planId: plan.id, name, homeGroupId: null })),
  );

  await Promise.all(
    shuffled.map((member, index) =>
      sharingAssignmentsCol.doc().set({
        sharingGroupId: groupRefs[index % count].ref.id,
        memberId: member.id,
      }),
    ),
  );

  return plan;
}

export async function moveMemberSharing(
  memberId: string,
  toSharingGroupId: string,
  planId: string,
) {
  const groups = await listSharingGroupsByPlan(planId);
  await Promise.all(
    groups.map(async (g) => {
      const snap = await sharingAssignmentsCol
        .where("sharingGroupId", "==", g.id)
        .where("memberId", "==", memberId)
        .get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }),
  );
  await sharingAssignmentsCol.doc().set({ sharingGroupId: toSharingGroupId, memberId });
}
