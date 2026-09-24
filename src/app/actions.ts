"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  isPastorOrAdmin,
  leaderCanAccessGroup,
} from "@/lib/auth";
import {
  assignMemberToGroup as assignMemberToGroupStore,
  createGroup as createGroupStore,
  createMember as createMemberStore,
  handoverGroupLeader,
  listAllMembers,
} from "@/lib/store/groups";
import { getUserById, updateOfficerTitle as updateOfficerTitleStore, updateServingDutyKeys as updateServingDutyKeysStore } from "@/lib/store/users";
import { getGroupById } from "@/lib/store/groups";
import {
  notifyPastorsAndAdminsOfFamilyReport,
  notifyUsersOfServingDutyAssignment,
} from "@/lib/push-notifications";
import {
  addMeetingAsset,
  createMeeting,
  getMeetingById,
  setMeetingDutyUser,
  setMeetingPrayerLeader,
  updateMeetingNotes as updateMeetingNotesStore,
} from "@/lib/store/meetings";
import { sendFamilyMessage } from "@/lib/store/reports";
import {
  autoSuggestSharingGroups,
  getPlanById,
  moveMemberSharing as moveMemberSharingStore,
} from "@/lib/store/sharing";
import { assignGroupSeating as assignGroupSeatingStore, createWorshipService as createWorshipServiceStore } from "@/lib/store/worship";
import {
  createAttendanceSunday as createAttendanceSundayStore,
  importQrNames,
  saveAttendanceMarks as saveAttendanceMarksStore,
  type SaveMarkEntry,
} from "@/lib/store/attendance";
import {
  createEventSurvey as createEventSurveyStore,
  getEventSurveyById as getEventSurveyByIdStore,
  saveSurveyResponses as saveSurveyResponsesStore,
  setEventSurveyStatus as setEventSurveyStatusStore,
  type SaveResponseEntry,
} from "@/lib/store/surveys";
import { parseNamesFromFile } from "@/lib/qr-import";
import { uploadMeetingFile } from "@/lib/storage";
import { getCurrentTerm, setCurrentTerm } from "@/lib/store/settings";
import { nextTerm } from "@/lib/term";
import type { AttendanceStatus, MeetingAssetKind, OfficerTitle, ServingDutyKey, SurveyQuestion, SurveyQuestionType } from "@/lib/types";
import { SERVING_DUTIES, SERVING_DUTY_BY_KEY } from "@/lib/types";

const MAX_SURVEY_QUESTIONS = 6;

async function sessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

/** 가족 보고: 가장 ↔ 목사가 나누는 한 방. aboutMemberId를 태그하면 어떤 가족원 이야기인지 남는다. */
export async function sendFamilyReportMessage(
  groupId: string,
  body: string,
  aboutMemberId?: string | null,
) {
  const user = await sessionUser();
  const trimmed = body.trim();
  if (!trimmed) return { error: "내용을 입력해 주세요." };

  if (user.role === "LEADER") {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) return { error: "권한이 없습니다." };
  } else if (!isPastorOrAdmin(user.role)) {
    return { error: "권한이 없습니다." };
  }

  await sendFamilyMessage({
    groupId,
    authorId: user.id,
    body: trimmed,
    aboutMemberId: aboutMemberId || null,
  });

  if (user.role === "LEADER") {
    const group = await getGroupById(groupId);
    if (group) {
      try {
        await notifyPastorsAndAdminsOfFamilyReport({
          groupId,
          groupName: group.name,
          leaderName: user.name ?? "가장",
          preview: trimmed,
        });
      } catch (err) {
        console.error("[push] family report notify failed", err);
      }
    }
  }

  revalidatePath(`/reports/${groupId}`);
  revalidatePath("/reports");
  return { ok: true };
}

export async function handoverLeader(groupId: string, newLeaderId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const newLeader = await getUserById(newLeaderId);
  if (!newLeader || newLeader.role !== "LEADER") {
    return { error: "새 가장은 리더 역할 사용자여야 합니다." };
  }

  await handoverGroupLeader(groupId, newLeaderId);

  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  return { ok: true };
}

export async function startNextFamilyTerm() {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  const current = await getCurrentTerm();
  const next = nextTerm(current);
  await setCurrentTerm(next);
  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  revalidatePath("/my-group");
  return { ok: true, term: next };
}

export async function updateOfficerTitle(userId: string, officerTitle: OfficerTitle | "") {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await updateOfficerTitleStore(userId, officerTitle || null);
  revalidatePath("/admin/handover");
  return { ok: true };
}

/** 목사·관리자가 로그인 사용자별 섬김 슬롯(본인 담당 후보)을 지정한다. */
export async function updateUserServingDuties(userId: string, formData: FormData) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const target = await getUserById(userId);
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  const keys = SERVING_DUTIES.map((d) => d.key).filter(
    (key) => formData.get(`duty_${key}`) === "on",
  ) as ServingDutyKey[];

  await updateServingDutyKeysStore(userId, keys);
  revalidatePath("/admin/handover");
  revalidatePath("/meetings");
  return { ok: true };
}

async function pushServingDutyAssignmentIfChanged(
  meetingId: string,
  dutyKey: ServingDutyKey,
  previousUserId: string | null,
  newUserId: string | null,
) {
  if (!newUserId || newUserId === previousUserId) return;
  const meeting = await getMeetingById(meetingId);
  if (!meeting) return;
  const dutyLabel = SERVING_DUTY_BY_KEY[dutyKey].label;
  try {
    await notifyUsersOfServingDutyAssignment({
      userIds: [newUserId],
      dutyLabel,
      meetingTitle: meeting.title,
      meetingDateIso: meeting.date,
      meetingId,
    });
  } catch (err) {
    console.error("[push] serving duty notify failed", err);
  }
}

export async function setMeetingServingDuty(
  meetingId: string,
  dutyKey: ServingDutyKey,
  userId: string,
) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  if (!SERVING_DUTY_BY_KEY[dutyKey]) return { error: "잘못된 섬김 항목입니다." };

  const normalized = userId.trim() || null;
  const { previousUserId } = await setMeetingDutyUser(meetingId, dutyKey, normalized);
  await pushServingDutyAssignmentIfChanged(meetingId, dutyKey, previousUserId, normalized);

  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function createLeaderMeeting(data: {
  title: string;
  date: string;
  notes?: string;
}) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const meeting = await createMeeting({
    title: data.title,
    date: new Date(data.date).toISOString(),
    notes: data.notes || null,
  });
  revalidatePath("/meetings");
  return { ok: true, id: meeting.id };
}

export async function updateMeetingNotes(meetingId: string, notes: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await updateMeetingNotesStore(meetingId, notes);
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function setPrayerLeader(meetingId: string, leaderId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  const normalized = leaderId.trim() || null;
  const { previousUserId } = await setMeetingPrayerLeader(meetingId, normalized);
  await pushServingDutyAssignmentIfChanged(
    meetingId,
    "prayer_meeting_lead",
    previousUserId,
    normalized,
  );
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function uploadMeetingAsset(
  meetingId: string,
  kind: MeetingAssetKind,
  formData: FormData,
) {
  const user = await sessionUser();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "파일을 선택해 주세요." };

  if (kind === "SCORE") {
    const meeting = await getMeetingById(meetingId);
    if (!meeting) return { error: "모임을 찾을 수 없습니다." };
    if (meeting.prayerLeaderId !== user.id && !isPastorOrAdmin(user.role)) {
      return { error: "기도회 인도자만 악보를 올릴 수 있습니다." };
    }
  } else if (!isPastorOrAdmin(user.role)) {
    return { error: "권한이 없습니다." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = await uploadMeetingFile({
    meetingId,
    kind,
    fileName: file.name,
    buffer,
    contentType: file.type,
  });
  await addMeetingAsset({
    meetingId,
    kind,
    fileName: file.name,
    storageKey,
    uploadedById: user.id,
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
  if (!isPastorOrAdmin(user.role) && user.role !== "LEADER") {
    return { error: "권한이 없습니다." };
  }

  const plan = await autoSuggestSharingGroups(
    meetingId,
    new Date(serviceDate).toISOString(),
    useHomeGroups,
    4,
  );
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true, planId: plan.id };
}

export async function runAutoSharing(meetingId: string, planId: string, groupCount: number) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== "LEADER") {
    return { error: "권한이 없습니다." };
  }
  const plan = await getPlanById(planId);
  if (!plan) return { error: "조편성을 찾을 수 없습니다." };
  await autoSuggestSharingGroups(meetingId, plan.serviceDate, plan.useHomeGroups, groupCount);
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function moveMemberSharing(
  memberId: string,
  toSharingGroupId: string,
  planId: string,
  meetingId: string,
) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== "LEADER") {
    return { error: "권한이 없습니다." };
  }
  await moveMemberSharingStore(memberId, toSharingGroupId, planId);
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function createWorshipService(date: string, title: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const service = await createWorshipServiceStore(new Date(date).toISOString(), title);
  revalidatePath("/worship");
  return { ok: true, id: service.id };
}

export async function assignGroupSeating(serviceId: string, groupId: string, zoneId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role) && user.role !== "LEADER") {
    return { error: "권한이 없습니다." };
  }
  await assignGroupSeatingStore(serviceId, groupId, zoneId);
  revalidatePath(`/worship/${serviceId}`);
  return { ok: true };
}

export async function createGroup(name: string, description?: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await createGroupStore(name, description || null);
  revalidatePath("/groups");
  return { ok: true };
}

export async function assignMemberToGroup(memberId: string, groupId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await assignMemberToGroupStore(memberId, groupId);
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
  await createMemberStore(groupId, name, phone || null);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/my-group");
  return { ok: true };
}

export async function setGroupLeader(groupId: string, leaderId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  return handoverLeader(groupId, leaderId);
}

/** 목사/관리자가 새 주일을 연다. */
export async function createAttendanceSunday(date: string, title: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const sunday = await createAttendanceSundayStore(new Date(date).toISOString(), title || "주일예배");
  revalidatePath("/attendance");
  return { ok: true, id: sunday.id };
}

/**
 * 가족원별 1-3부/4부 참석·방송을 저장한다. 가장은 자기 가족만, 목사/관리자는 어느 가족이든 저장할 수 있고
 * QR도 수동으로 고칠 수 있다(`qr13_{memberId}` / `qr4_{memberId}` 체크박스가 폼에 있을 때만).
 */
export async function saveAttendanceMarks(sundayId: string, groupId: string, formData: FormData) {
  const user = await sessionUser();
  const canEditQr = isPastorOrAdmin(user.role);
  if (!canEditQr) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) return { error: "권한이 없습니다." };
  }

  const memberIds = formData.getAll("memberId").map(String);
  const entries: SaveMarkEntry[] = memberIds.map((memberId) => {
    const s13Status = ((formData.get(`s13_${memberId}`) as string) || "none") as AttendanceStatus;
    const s4Status = ((formData.get(`s4_${memberId}`) as string) || "none") as AttendanceStatus;
    const familyMeeting = formData.get(`family_${memberId}`) === "on";
    const entry: SaveMarkEntry = { memberId, groupId, s13Status, s4Status, familyMeeting };
    if (canEditQr) {
      entry.s13Qr = formData.get(`qr13_${memberId}`) === "on";
      entry.s4Qr = formData.get(`qr4_${memberId}`) === "on";
    }
    return entry;
  });

  await saveAttendanceMarksStore(sundayId, entries, user.id);
  revalidatePath(`/attendance/${sundayId}`);
  revalidatePath(`/attendance/${sundayId}/${groupId}`);
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** QR 명단 파일(CSV/xlsx)을 업로드해 이름이 일치하는 가족원의 그 부 QR을 켠다. 목사/관리자만 가능. */
export async function importAttendanceQr(sundayId: string, service: "s13" | "s4", formData: FormData) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "파일을 선택해 주세요." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const names = await parseNamesFromFile(buffer, file.name);
  if (names.length === 0) return { error: "파일에서 이름을 찾지 못했습니다." };

  const members = await listAllMembers();
  const result = await importQrNames({
    sundayId,
    service,
    names,
    members: members.map((m) => ({ id: m.id, groupId: m.groupId, name: m.name })),
    updatedById: user.id,
  });

  revalidatePath(`/attendance/${sundayId}`);

  const params = new URLSearchParams({
    qrService: service,
    qrMatched: String(result.matchedNames.length),
    qrAmbiguous: result.ambiguousNames.join(","),
    qrUnmatched: result.unmatchedNames.join(","),
  });
  redirect(`/attendance/${sundayId}?${params.toString()}`);
}

/** 목사/관리자가 참여조사를 만든다. q1_label..q6_label / q1_type..q6_type 필드로 질문을 받는다. */
export async function createEventSurvey(formData: FormData) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };

  const title = ((formData.get("title") as string) || "").trim();
  const eventDate = formData.get("eventDate") as string;
  const description = ((formData.get("description") as string) || "").trim();
  if (!title || !eventDate) return { error: "제목과 날짜를 입력해 주세요." };

  const questions: SurveyQuestion[] = [];
  for (let i = 1; i <= MAX_SURVEY_QUESTIONS; i++) {
    const label = ((formData.get(`q${i}_label`) as string) || "").trim();
    if (!label) continue;
    const type = ((formData.get(`q${i}_type`) as string) || "yesno") as SurveyQuestionType;
    questions.push({ id: `q${i}`, label, type });
  }
  if (questions.length === 0) return { error: "질문을 1개 이상 입력해 주세요." };

  const survey = await createEventSurveyStore({
    title,
    eventDate: new Date(eventDate).toISOString(),
    description: description || null,
    questions,
  });
  revalidatePath("/surveys");
  return { ok: true, id: survey.id };
}

export async function closeEventSurvey(surveyId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await setEventSurveyStatusStore(surveyId, "closed");
  revalidatePath(`/surveys/${surveyId}`);
  revalidatePath("/surveys");
  return { ok: true };
}

export async function reopenEventSurvey(surveyId: string) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) return { error: "권한이 없습니다." };
  await setEventSurveyStatusStore(surveyId, "open");
  revalidatePath(`/surveys/${surveyId}`);
  revalidatePath("/surveys");
  return { ok: true };
}

/** 가장은 자기 가족원 응답만, 목사/관리자는 어느 가족이든 저장할 수 있다. */
export async function saveSurveyResponses(surveyId: string, groupId: string, formData: FormData) {
  const user = await sessionUser();
  if (!isPastorOrAdmin(user.role)) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) return { error: "권한이 없습니다." };
  }

  const survey = await getEventSurveyByIdStore(surveyId);
  if (!survey) return { error: "조사를 찾을 수 없습니다." };
  if (survey.status === "closed" && !isPastorOrAdmin(user.role)) {
    return { error: "마감된 조사입니다." };
  }

  const memberIds = formData.getAll("memberId").map(String);
  const entries: SaveResponseEntry[] = memberIds.map((memberId) => {
    const answers: Record<string, string | number | boolean> = {};
    for (const q of survey.questions) {
      const raw = formData.get(`${q.id}_${memberId}`);
      if (raw === null) continue;
      if (q.type === "yesno") {
        answers[q.id] = raw === "on";
      } else if (q.type === "number") {
        const num = Number(raw);
        if (!Number.isNaN(num) && String(raw).trim() !== "") answers[q.id] = num;
      } else {
        const text = String(raw).trim();
        if (text) answers[q.id] = text;
      }
    }
    return { memberId, groupId, answers };
  });

  await saveSurveyResponsesStore(surveyId, entries, user.id);
  revalidatePath(`/surveys/${surveyId}`);
  revalidatePath(`/surveys/${surveyId}/${groupId}`);
  return { ok: true };
}
