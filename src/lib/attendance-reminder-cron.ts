import { notifyLeadersOfAttendanceReminder } from "@/lib/push-notifications";
import { kstDateKeyNow } from "@/lib/kst-date";
import { getAttendanceSundayByKstDateKey } from "@/lib/store/attendance";
import {
  getAttendanceReminderState,
  setAttendanceReminderState,
} from "@/lib/store/attendance-reminder-state";
import { listCurrentLeaderUserIds } from "@/lib/store/groups";

export type AttendanceReminderCronResult =
  | { status: "skipped"; reason: string }
  | {
      status: "sent";
      sundayId: string;
      leaderCount: number;
      tokenBatchNote: string;
    };

/**
 * Vercel Cron(주일 18:00, 서울)에서 호출한다.
 * 목사가 열어 둔 오늘 주일 문서가 있을 때만, 담당 가족이 있는 가장에게 1회 알린다.
 */
export async function runAttendanceReminderCron(): Promise<AttendanceReminderCronResult> {
  const todayKey = kstDateKeyNow();
  const sunday = await getAttendanceSundayByKstDateKey(todayKey);
  if (!sunday) {
    return { status: "skipped", reason: `no_attendance_sunday_for_${todayKey}` };
  }

  const prev = await getAttendanceReminderState();
  if (prev?.lastRemindedSundayId === sunday.id) {
    return { status: "skipped", reason: "already_reminded_for_sunday" };
  }

  const leaderIds = await listCurrentLeaderUserIds();
  if (leaderIds.length === 0) {
    return { status: "skipped", reason: "no_leader_users_with_groups" };
  }

  await notifyLeadersOfAttendanceReminder({
    userIds: leaderIds,
    sundayId: sunday.id,
    sundayTitle: sunday.title,
    sundayDateIso: sunday.date,
  });

  await setAttendanceReminderState({
    lastRemindedSundayId: sunday.id,
    remindedAt: new Date().toISOString(),
  });

  return {
    status: "sent",
    sundayId: sunday.id,
    leaderCount: leaderIds.length,
    tokenBatchNote: "tokens_sent_if_subscribed",
  };
}
