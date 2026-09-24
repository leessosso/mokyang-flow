import { getDb } from "@/lib/firebase-admin";

const STATE_DOC = "settings/attendanceReminder";

export type AttendanceReminderState = {
  lastRemindedSundayId: string;
  remindedAt: string;
};

export async function getAttendanceReminderState(): Promise<AttendanceReminderState | null> {
  const doc = await getDb().doc(STATE_DOC).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data?.lastRemindedSundayId || !data.remindedAt) return null;
  return {
    lastRemindedSundayId: String(data.lastRemindedSundayId),
    remindedAt: String(data.remindedAt),
  };
}

export async function setAttendanceReminderState(state: AttendanceReminderState): Promise<void> {
  await getDb().doc(STATE_DOC).set(state);
}
