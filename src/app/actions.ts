"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/client";
import {
  isPastorOrAdmin,
  leaderCanAccessMember,
  leaderCanAccessGroup,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { autoSuggestSharingGroups } from "@/lib/sharing";

async function sessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

export async function sendPastoralMessage(memberId: string, body: string) {
  const user = await sessionUser();
  const trimmed = body.trim();
  if (!trimmed) return { error: "내용을 입력해 주세요." };

  if (user.role === Role.LEADER) {
    const ok = await leaderCanAccessMember(user.id, memberId);
    if (!ok) return { error: "권한이 없습니다." };
  } else if (!isPastorOrAdmin(user.role)) {
    return { error: "권한이 없습니다." };
  }

  let thread = await prisma.pastoralThread.findUnique({ where: { memberId } });
  if (!thread) {
    thread = await prisma.pastoralThread.create({ data: { memberId } });
  }

  await prisma.pastoralMessage.create({
    data: { threadId: thread.id, authorId: user.id, body: trimmed },
  });
  revalidatePath(`/reports/${memberId}`);
  revalidatePath("/reports");
  return { ok: true };
}

export async function handoverLeader(groupId: string, newLeaderId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return { error: "조를 찾을 수 없습니다." };

  const newLeader = await prisma.user.findUnique({ where: { id: newLeaderId } });
  if (!newLeader || newLeader.role !== Role.LEADER) {
    return { error: "새 조장은 조장 역할 사용자여야 합니다." };
  }

  const now = new Date();
  if (group.currentLeaderId) {
    const active = await prisma.groupLeaderTerm.findFirst({
      where: { groupId, leaderId: group.currentLeaderId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (active) {
      await prisma.groupLeaderTerm.update({
        where: { id: active.id },
        data: { endedAt: now },
      });
    }
  }

  await prisma.groupLeaderTerm.create({
    data: { groupId, leaderId: newLeaderId, startedAt: now },
  });
  await prisma.group.update({
    where: { id: groupId },
    data: { currentLeaderId: newLeaderId },
  });

  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  return { ok: true };
}

export async function createLeaderMeeting(data: {
  title: string;
  date: string;
  notes?: string;
}) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const meeting = await prisma.leaderMeeting.create({
    data: {
      title: data.title,
      date: new Date(data.date),
      notes: data.notes || null,
    },
  });
  revalidatePath("/meetings");
  return { ok: true, id: meeting.id };
}

export async function updateMeetingNotes(meetingId: string, notes: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await prisma.leaderMeeting.update({
    where: { id: meetingId },
    data: { notes },
  });
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function createSharingPlan(
  meetingId: string,
  serviceDate: string,
  useHomeGroups: boolean,
) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== Role.LEADER) {
    return { error: "권한이 없습니다." };
  }

  const existing = await prisma.sharingPlan.findUnique({
    where: { meetingId },
  });
  if (existing) {
    await prisma.sharingPlan.update({
      where: { id: existing.id },
      data: {
        serviceDate: new Date(serviceDate),
        useHomeGroups,
      },
    });
    await autoSuggestSharingGroups(existing.id, 4);
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, planId: existing.id };
  }

  const plan = await prisma.sharingPlan.create({
    data: {
      meetingId,
      serviceDate: new Date(serviceDate),
      useHomeGroups,
    },
  });
  await autoSuggestSharingGroups(plan.id, 4);
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, planId: plan.id };
}

export async function runAutoSharing(planId: string, groupCount: number) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== Role.LEADER) {
    return { error: "권한이 없습니다." };
  }
  await autoSuggestSharingGroups(planId, groupCount);
  const plan = await prisma.sharingPlan.findUnique({ where: { id: planId } });
  if (plan?.meetingId) revalidatePath(`/meetings/${plan.meetingId}`);
  return { ok: true };
}

export async function moveMemberSharing(
  memberId: string,
  toSharingGroupId: string,
  planId: string,
) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== Role.LEADER) {
    return { error: "권한이 없습니다." };
  }

  await prisma.sharingAssignment.deleteMany({
    where: { memberId, sharingGroup: { planId } },
  });
  await prisma.sharingAssignment.create({
    data: { memberId, sharingGroupId: toSharingGroupId },
  });
  const plan = await prisma.sharingPlan.findUnique({ where: { id: planId } });
  if (plan?.meetingId) revalidatePath(`/meetings/${plan.meetingId}`);
  return { ok: true };
}

export async function createWorshipService(date: string, title: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const service = await prisma.worshipService.create({
    data: { date: new Date(date), title },
  });
  const zoneNames = ["좌측 A구역", "중앙 B구역", "우측 C구역", "발코니 D구역"];
  for (let i = 0; i < zoneNames.length; i++) {
    await prisma.seatingZone.create({
      data: {
        serviceId: service.id,
        name: zoneNames[i],
        sortOrder: i,
        gridRow: Math.floor(i / 2),
        gridCol: i % 2,
      },
    });
  }
  revalidatePath("/worship");
  return { ok: true, id: service.id };
}

export async function assignGroupSeating(
  serviceId: string,
  groupId: string,
  zoneId: string,
) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== Role.LEADER) {
    return { error: "권한이 없습니다." };
  }

  await prisma.seatingAssignment.upsert({
    where: { serviceId_groupId: { serviceId, groupId } },
    create: { serviceId, groupId, zoneId },
    update: { zoneId },
  });
  revalidatePath(`/worship/${serviceId}`);
  return { ok: true };
}

export async function createGroup(name: string, description?: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await prisma.group.create({ data: { name, description: description || null } });
  revalidatePath("/groups");
  return { ok: true };
}

export async function assignMemberToGroup(memberId: string, groupId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await prisma.member.update({ where: { id: memberId }, data: { groupId } });
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

export async function createMember(groupId: string, name: string, phone?: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) return { error: "권한이 없습니다." };
  }
  await prisma.member.create({
    data: { groupId, name, phone: phone || null },
  });
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/my-group");
  return { ok: true };
}

export async function setGroupLeader(groupId: string, leaderId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  return handoverLeader(groupId, leaderId);
}
