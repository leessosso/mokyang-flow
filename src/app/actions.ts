"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  isPastorOrAdmin,
  leaderCanAccessGroup,
} from "@/lib/auth";
import { canManageAnnouncements, canManageApp, isSpecialAttendance, SERVING_DUTY_BY_KEY } from "@/lib/types";
import {
  assignMemberToGroup as assignMemberToGroupStore,
  createGroup as createGroupStore,
  createMember as createMemberStore,
  handoverGroupLeader,
  listAllMembers,
  listCurrentLeaderUserIds,
  listMembersByGroup,
} from "@/lib/store/groups";
import { appointOfficer, endOfficerYear, listActiveOfficers, vacateOfficer } from "@/lib/store/officers";
import { hashPassword } from "@/lib/password";
import { getUserByEmail, getUserById, createUser } from "@/lib/store/users";
import { getGroupById } from "@/lib/store/groups";
import {
  notifyPastorsAndAdminsOfFamilyReport,
  notifyUsersOfAnnouncement,
  notifyUsersOfServingDutyAssignment,
} from "@/lib/push-notifications";
import {
  createAnnouncementDraft,
  getAnnouncementById as getAnnouncementByIdStore,
  markAnnouncementSent,
  resolveAnnouncementRecipientUserIds,
  updateAnnouncementDraft,
  deleteAnnouncementDraft,
} from "@/lib/store/announcements";
import {
  addMeetingAsset,
  createMeeting,
  getMeetingById,
  setMeetingDutyUser,
  setMeetingPrayerLeader,
  updateMeetingNotes as updateMeetingNotesStore,
} from "@/lib/store/meetings";
import { sendFamilyMessage } from "@/lib/store/reports";
import { assignGroupSeating as assignGroupSeatingStore, createWorshipService as createWorshipServiceStore } from "@/lib/store/worship";
import { isWeeklyAttendanceOpen, kstDateKeyFromIso } from "@/lib/kst-date";
import {
  createSpecialAttendance as createSpecialAttendanceStore,
  importQrNames,
  resolveAttendanceSunday,
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
import { parseMemberRowsFromFile, parseMemberRowsFromText } from "@/lib/member-import";
import { uploadMeetingFile } from "@/lib/storage";
import { getCurrentTerm, setCurrentTerm } from "@/lib/store/settings";
import { nextTerm, sameTerm } from "@/lib/term";
import { OFFICER_TITLES, type OfficerTitle } from "@/lib/types";
import type {
  AnnouncementAudience,
  AttendanceStatus,
  MeetingAssetKind,
  ServingDutyKey,
  SurveyQuestion,
  SurveyQuestionType,
} from "@/lib/types";

const MAX_SURVEY_QUESTIONS = 6;

async function sessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user;
}

async function requireAppManager() {
  const session = await sessionUser();
  const full = await getUserById(session.id);
  if (!full || !canManageApp(full)) return null;
  return full;
}

async function requirePastor() {
  const session = await sessionUser();
  const full = await getUserById(session.id);
  if (!full || !isPastorOrAdmin(full.role)) return null;
  return full;
}

async function requireAnnouncementManager() {
  const user = await sessionUser();
  const full = await getUserById(user.id);
  if (!full || !canManageAnnouncements(full)) {
    return { error: "권한이 없습니다." as const, user: null };
  }
  return { user: full, error: null };
}

function parseAnnouncementAudience(raw: FormDataEntryValue | null): AnnouncementAudience | null {
  if (raw === "all" || raw === "leaders" || raw === "users") return raw;
  return null;
}

function parseAnnouncementFields(formData: FormData) {
  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const audience = parseAnnouncementAudience(formData.get("audience"));
  const selectedUserIds = formData.getAll("selectedUserIds").map(String).filter(Boolean);
  const intent = formData.get("intent") === "send" ? "send" : "draft";
  return { title, body, audience, selectedUserIds, intent };
}

async function sendAnnouncementPush(announcementId: string, sentById: string) {
  const ann = await getAnnouncementByIdStore(announcementId);
  if (!ann) return { error: "공지를 찾을 수 없습니다." };
  if (ann.status === "sent") return { error: "이미 발송된 공지입니다." };

  if (ann.audience === "users" && ann.selectedUserIds.length === 0) {
    return { error: "발송 대상 사용자를 1명 이상 선택해 주세요." };
  }

  const recipientIds = await resolveAnnouncementRecipientUserIds(ann.audience, ann.selectedUserIds);

  let pushSuccessCount = 0;
  let pushFailureCount = 0;
  try {
    const stats = await notifyUsersOfAnnouncement({
      userIds: recipientIds,
      announcementId: ann.id,
      title: ann.title,
      bodyPreview: ann.body,
    });
    pushSuccessCount = stats.successCount;
    pushFailureCount = stats.failureCount;
  } catch (err) {
    console.error("[push] announcement notify failed", err);
    return { error: "푸시 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  await markAnnouncementSent(announcementId, {
    sentById,
    pushSuccessCount,
    pushFailureCount,
  });

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${announcementId}`);
  return { ok: true as const, pushSuccessCount, pushFailureCount, recipientCount: recipientIds.length };
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
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };

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
  const manager = await requireAppManager();
  if (!manager) return { error: "권한이 없습니다." };
  const current = await getCurrentTerm();
  const next = nextTerm(current);
  if (next.half === "H1") {
    if (!isPastorOrAdmin(manager.role)) {
      return { error: "다음 해 상반기는 목사만 열 수 있습니다." };
    }
    await endOfficerYear(current.year);
  }
  await setCurrentTerm(next);
  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return { ok: true, term: next };
}

function readNewLeader(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name) return { ok: false as const, error: "이름을 입력해 주세요." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "이메일을 확인해 주세요." };
  if (password.length < 8) return { ok: false as const, error: "비밀번호는 8자 이상이어야 합니다." };
  return { ok: true as const, name, email, password };
}

async function createLeaderAccount(formData: FormData) {
  const fields = readNewLeader(formData);
  if (!fields.ok) return fields;
  const existing = await getUserByEmail(fields.email);
  if (existing) return { ok: false as const, error: "이미 등록된 이메일입니다." };
  const user = await createUser({
    email: fields.email,
    passwordHash: await hashPassword(fields.password),
    name: fields.name,
    role: "LEADER",
  });
  return { ok: true as const, user };
}

function officerSeatError(result: "seat_taken" | "already_officer") {
  if (result === "seat_taken") return "이미 맡은 사람이 있습니다. 비운 뒤에 지정해 주세요.";
  return "이 사람은 올해 다른 직책이 있습니다.";
}

export async function appointOfficerAction(formData: FormData) {
  if (!(await requirePastor())) return { ok: false as const, error: "임원 직책은 목사만 지정할 수 있습니다." };
  const title = String(formData.get("title") ?? "");
  if (!OFFICER_TITLES.includes(title as OfficerTitle)) return { ok: false as const, error: "잘못된 직책입니다." };
  const userId = String(formData.get("userId") ?? "");
  const leader = await getUserById(userId);
  if (!leader || leader.role !== "LEADER") return { ok: false as const, error: "리더 계정을 선택해 주세요." };

  const term = await getCurrentTerm();
  const result = await appointOfficer(term.year, userId, title as OfficerTitle);
  if (result !== "ok") return { ok: false as const, error: officerSeatError(result) };

  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  return { ok: true as const };
}

export async function createOfficerAction(formData: FormData) {
  if (!(await requirePastor())) return { ok: false as const, error: "임원 직책은 목사만 지정할 수 있습니다." };
  const title = String(formData.get("title") ?? "");
  if (!OFFICER_TITLES.includes(title as OfficerTitle)) return { ok: false as const, error: "잘못된 직책입니다." };

  const term = await getCurrentTerm();
  const active = await listActiveOfficers(term.year);
  if (active.some((appointment) => appointment.title === title)) {
    return { ok: false as const, error: "이미 맡은 사람이 있습니다. 비운 뒤에 지정해 주세요." };
  }

  const created = await createLeaderAccount(formData);
  if (!created.ok) return created;

  const result = await appointOfficer(term.year, created.user.id, title as OfficerTitle);
  if (result !== "ok") return { ok: false as const, error: officerSeatError(result) };

  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  return { ok: true as const };
}

export async function vacateOfficerAction(formData: FormData) {
  if (!(await requirePastor())) return { ok: false as const, error: "임원 직책은 목사만 비울 수 있습니다." };
  const title = String(formData.get("title") ?? "");
  if (!OFFICER_TITLES.includes(title as OfficerTitle)) return { ok: false as const, error: "잘못된 직책입니다." };
  const term = await getCurrentTerm();
  await vacateOfficer(term.year, title as OfficerTitle);
  revalidatePath("/admin/handover");
  revalidatePath("/groups");
  return { ok: true as const };
}

export async function createLeaderAction(formData: FormData) {
  if (!(await requireAppManager())) return { ok: false as const, error: "권한이 없습니다." };
  const created = await createLeaderAccount(formData);
  if (!created.ok) return created;
  revalidatePath("/groups");
  revalidatePath("/admin/handover");
  return { ok: true as const };
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
      dutyKey,
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
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  if (!SERVING_DUTY_BY_KEY[dutyKey]) return { error: "잘못된 섬김 항목입니다." };

  const normalized = userId.trim() || null;
  if (dutyKey === "prayer_meeting_lead" && normalized) {
    const leaderIds = await listCurrentLeaderUserIds();
    if (!leaderIds.includes(normalized)) {
      return { error: "기도회는 이번 학기 가장만 인도할 수 있습니다." };
    }
  }
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
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };

  const meeting = await createMeeting({
    title: data.title,
    date: new Date(data.date).toISOString(),
    notes: data.notes || null,
  });
  revalidatePath("/meetings");
  return { ok: true, id: meeting.id };
}

export async function updateMeetingNotes(meetingId: string, notes: string) {
  const { error } = await requireAnnouncementManager();
  if (error) return { error };
  await updateMeetingNotesStore(meetingId, notes);
  revalidatePath(`/meetings/${meetingId}`);
  return { ok: true };
}

export async function setPrayerLeader(meetingId: string, leaderId: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  const normalized = leaderId.trim() || null;
  if (normalized) {
    const leaderIds = await listCurrentLeaderUserIds();
    if (!leaderIds.includes(normalized)) {
      return { error: "기도회는 이번 학기 가장만 인도할 수 있습니다." };
    }
  }
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
  const actor = await getUserById(user.id);
  const manages = !!actor && canManageApp(actor);
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "파일을 선택해 주세요." };

  if (kind === "SCORE") {
    const meeting = await getMeetingById(meetingId);
    if (!meeting) return { error: "모임을 찾을 수 없습니다." };
    if (meeting.prayerLeaderId !== user.id && !manages) {
      return { error: "기도회 인도자만 악보를 올릴 수 있습니다." };
    }
  } else if (!manages) {
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

export async function createWorshipService(date: string, title: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };

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

export async function createGroup(name: string, leaderId: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "가족 이름을 입력해 주세요." };

  const leader = await getUserById(leaderId);
  if (!leader || leader.role !== "LEADER") {
    return { error: "가장은 리더 역할 사용자여야 합니다." };
  }

  const group = await createGroupStore(trimmed);
  await handoverGroupLeader(group.id, leader.id);
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/admin/handover");
  return { ok: true };
}

export async function assignMemberToGroup(memberId: string, groupId: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  await assignMemberToGroupStore(memberId, groupId);
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

async function currentTermGroup(groupId: string) {
  const group = await getGroupById(groupId);
  if (!group) return { ok: false as const, error: "가족을 선택해 주세요." };
  const term = await getCurrentTerm();
  if (!sameTerm({ year: group.year, half: group.half }, term)) {
    return { ok: false as const, error: "이번 학기 가족에만 넣을 수 있습니다." };
  }
  return { ok: true as const, group };
}

export async function createMember(groupId: string, name: string, phone?: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "이름을 입력해 주세요." };
  const target = await currentTermGroup(groupId);
  if (!target.ok) return { error: target.error };
  await createMemberStore(target.group.id, trimmed, phone?.trim() || null);
  revalidatePath("/groups");
  revalidatePath("/admin/members");
  revalidatePath(`/groups/${target.group.id}`);
  return { ok: true };
}

const MAX_MEMBER_IMPORT = 500;

export async function importGroupMembers(formData: FormData) {
  if (!(await requireAppManager())) return { ok: false as const, error: "권한이 없습니다." };
  const target = await currentTermGroup(String(formData.get("groupId") ?? ""));
  if (!target.ok) return { ok: false as const, error: target.error };
  const groupId = target.group.id;

  const file = formData.get("file");
  let rows;
  try {
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      rows = await parseMemberRowsFromFile(buffer, file.name || "members.csv");
    } else {
      rows = parseMemberRowsFromText(String(formData.get("text") ?? ""));
    }
  } catch {
    return { ok: false as const, error: "파일을 읽지 못했습니다. CSV 또는 xlsx로 저장해 주세요." };
  }

  if (rows.length === 0) return { ok: false as const, error: "넣을 이름이 없습니다." };
  if (rows.length > MAX_MEMBER_IMPORT) {
    return { ok: false as const, error: `한 번에 ${MAX_MEMBER_IMPORT}명까지 넣을 수 있습니다.` };
  }

  const existing = new Set((await listMembersByGroup(groupId)).map((member) => member.name.trim()));
  let added = 0;
  let skipped = 0;
  for (const row of rows) {
    if (existing.has(row.name)) {
      skipped += 1;
      continue;
    }
    await createMemberStore(groupId, row.name, row.phone);
    existing.add(row.name);
    added += 1;
  }

  revalidatePath("/groups");
  revalidatePath("/admin/members");
  revalidatePath(`/groups/${groupId}`);
  return { ok: true as const, added, skipped };
}

export async function setGroupLeader(groupId: string, leaderId: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  return handoverLeader(groupId, leaderId);
}

/** 임원·목사가 비정기 출석체크를 연다. 매주 주일 출석은 여기서 만들지 않는다. */
export async function createSpecialAttendance(date: string, title: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  if (!date) return { error: "날짜를 입력해 주세요." };

  const sunday = await createSpecialAttendanceStore(date, title);
  revalidatePath("/attendance");
  return { ok: true, id: sunday.id };
}

/** 매주 주일 출석은 그 주일부터 토요일까지만 고친다. 비정기 출석체크는 그대로 연다. */
async function openAttendanceSundayId(sundayId: string): Promise<{ error: string } | { id: string }> {
  const sunday = await resolveAttendanceSunday(sundayId);
  if (!sunday) return { error: "출석을 찾을 수 없습니다." };
  if (!isSpecialAttendance(sunday) && !isWeeklyAttendanceOpen(kstDateKeyFromIso(sunday.date))) {
    return { error: "이번 주일 출석만 그 주 토요일까지 입력할 수 있습니다." };
  }
  return { id: sunday.id };
}

/**
 * 가족원별 1-3부/4부 참석·방송을 저장한다. 가장은 자기 가족만, 임원·목사는 어느 가족이든 저장할 수 있고
 * QR도 수동으로 고칠 수 있다(`qr13_{memberId}` / `qr4_{memberId}` 체크박스가 폼에 있을 때만).
 */
export async function saveAttendanceMarks(sundayId: string, groupId: string, formData: FormData) {
  const user = await sessionUser();
  const actor = await getUserById(user.id);
  const canEditQr = !!actor && canManageApp(actor);
  if (!canEditQr) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) return { error: "권한이 없습니다." };
  }

  const opened = await openAttendanceSundayId(sundayId);
  if ("error" in opened) return opened;
  sundayId = opened.id;

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

/** QR 명단 파일(CSV/xlsx)을 업로드해 이름이 일치하는 가족원의 그 부 QR을 켠다. 임원·목사만 가능. */
export async function importAttendanceQr(sundayId: string, service: "s13" | "s4", formData: FormData) {
  const actor = await requireAppManager();
  if (!actor) return { error: "권한이 없습니다." };

  const opened = await openAttendanceSundayId(sundayId);
  if ("error" in opened) return opened;
  sundayId = opened.id;

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
    updatedById: actor.id,
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

/**
 * 참여조사를 만든다.
 * mode=participation: 가족원마다 참여 여부만 받는다.
 * mode=questions: q1_label..q6_label / q1_type..q6_type 으로 질문을 받는다.
 */
export async function createEventSurvey(
  formData: FormData,
): Promise<{ error: string } | { ok: true; id: string }> {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };

  const mode = formData.get("mode");
  const title = ((formData.get("title") as string) || "").trim();
  const eventDate = formData.get("eventDate") as string;
  const description = ((formData.get("description") as string) || "").trim();
  if (mode !== "participation" && mode !== "questions") {
    return { error: "조사 방식을 선택해 주세요." };
  }
  if (!title || !eventDate) return { error: "제목과 날짜를 입력해 주세요." };

  let questions: SurveyQuestion[];
  if (mode === "participation") {
    const label = ((formData.get("participationLabel") as string) || "").trim() || "참여";
    questions = [{ id: "plan", label, type: "yesno" }];
  } else {
    questions = [];
    for (let i = 1; i <= MAX_SURVEY_QUESTIONS; i++) {
      const label = ((formData.get(`q${i}_label`) as string) || "").trim();
      if (!label) continue;
      const type = ((formData.get(`q${i}_type`) as string) || "yesno") as SurveyQuestionType;
      if (type !== "yesno" && type !== "number" && type !== "text") {
        return { error: "질문 유형이 올바르지 않습니다." };
      }
      questions.push({ id: `q${i}`, label, type });
    }
    if (questions.length === 0) return { error: "질문을 1개 이상 입력해 주세요." };
  }

  const survey = await createEventSurveyStore({
    title,
    eventDate: new Date(eventDate).toISOString(),
    description: description || null,
    kind: mode === "participation" ? "participation" : "general",
    questions,
  });
  revalidatePath("/surveys");
  return { ok: true, id: survey.id };
}

export async function closeEventSurvey(surveyId: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  await setEventSurveyStatusStore(surveyId, "closed");
  revalidatePath(`/surveys/${surveyId}`);
  revalidatePath("/surveys");
  return { ok: true };
}

export async function reopenEventSurvey(surveyId: string) {
  if (!(await requireAppManager())) return { error: "권한이 없습니다." };
  await setEventSurveyStatusStore(surveyId, "open");
  revalidatePath(`/surveys/${surveyId}`);
  revalidatePath("/surveys");
  return { ok: true };
}

/** 가장은 자기 가족원 응답만, 임원·목사는 어느 가족이든 저장할 수 있다. */
export async function saveSurveyResponses(surveyId: string, groupId: string, formData: FormData) {
  const user = await sessionUser();
  const actor = await getUserById(user.id);
  const manages = !!actor && canManageApp(actor);
  if (!manages) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) return { error: "권한이 없습니다." };
  }

  const survey = await getEventSurveyByIdStore(surveyId);
  if (!survey) return { error: "조사를 찾을 수 없습니다." };
  if (survey.status === "closed" && !manages) {
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

/** 공지 임시저장 또는 지금 보내기 (신규). */
export async function createAnnouncement(formData: FormData) {
  const authz = await requireAnnouncementManager();
  if (authz.error) return { error: authz.error };

  const { title, body, audience, selectedUserIds, intent } = parseAnnouncementFields(formData);
  if (!title || !body) return { error: "제목과 본문을 입력해 주세요." };
  if (!audience) return { error: "발송 대상을 선택해 주세요." };
  if (audience === "users" && selectedUserIds.length === 0 && intent === "send") {
    return { error: "발송 대상 사용자를 1명 이상 선택해 주세요." };
  }

  const draft = await createAnnouncementDraft({
    title,
    body,
    audience,
    selectedUserIds,
    createdById: authz.user!.id,
  });

  revalidatePath("/announcements");

  if (intent === "draft") {
    redirect(`/announcements/${draft.id}`);
  }

  const sent = await sendAnnouncementPush(draft.id, authz.user!.id);
  if (sent.error) {
    redirect(`/announcements/${draft.id}?sendError=${encodeURIComponent(sent.error)}`);
  }
  redirect(`/announcements/${draft.id}?sent=1`);
}

/** 임시저장 공지 수정·발송. */
export async function updateAnnouncement(announcementId: string, formData: FormData) {
  const authz = await requireAnnouncementManager();
  if (authz.error) return { error: authz.error };

  const existing = await getAnnouncementByIdStore(announcementId);
  if (!existing) return { error: "공지를 찾을 수 없습니다." };
  if (existing.status === "sent") return { error: "발송된 공지는 수정할 수 없습니다." };

  const { title, body, audience, selectedUserIds, intent } = parseAnnouncementFields(formData);
  if (!title || !body) return { error: "제목과 본문을 입력해 주세요." };
  if (!audience) return { error: "발송 대상을 선택해 주세요." };

  await updateAnnouncementDraft(announcementId, { title, body, audience, selectedUserIds });
  revalidatePath("/announcements");
  revalidatePath(`/announcements/${announcementId}`);

  if (intent === "draft") {
    redirect(`/announcements/${announcementId}`);
  }

  const sent = await sendAnnouncementPush(announcementId, authz.user!.id);
  if (sent.error) {
    redirect(`/announcements/${announcementId}?sendError=${encodeURIComponent(sent.error)}`);
  }
  redirect(`/announcements/${announcementId}?sent=1`);
}

export async function deleteAnnouncement(announcementId: string) {
  const authz = await requireAnnouncementManager();
  if (authz.error) return { error: authz.error };

  try {
    await deleteAnnouncementDraft(announcementId);
  } catch {
    return { error: "발송된 공지는 삭제할 수 없습니다." };
  }
  revalidatePath("/announcements");
  redirect("/announcements");
}
