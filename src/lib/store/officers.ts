import { officerAppointmentsCol, withId } from "@/lib/store/collections";
import { listUsersByRole, updateOfficerTitle } from "@/lib/store/users";
import { OFFICER_TITLES, type OfficerAppointment, type OfficerTitle } from "@/lib/types";

export async function listYearAppointments(year: number): Promise<OfficerAppointment[]> {
  const snap = await officerAppointmentsCol.where("year", "==", year).get();
  return snap.docs.map(withId);
}

/** 직책 문서가 없는 해는 계정에 남아 있는 직책으로 한 번 채운다. */
async function ensureLegacyOfficers(year: number) {
  const existing = await listYearAppointments(year);
  if (existing.length > 0) return;

  const leaders = await listUsersByRole("LEADER");
  const usedTitles = new Set<OfficerTitle>();
  for (const user of leaders) {
    const title = user.officerTitle;
    if (!title || !OFFICER_TITLES.includes(title) || usedTitles.has(title)) {
      if (title) await updateOfficerTitle(user.id, null);
      continue;
    }
    usedTitles.add(title);
    await officerAppointmentsCol.doc().set({
      userId: user.id,
      year,
      title,
      startedAt: user.createdAt,
      endedAt: null,
    });
  }
}

export async function listActiveOfficers(year: number): Promise<OfficerAppointment[]> {
  await ensureLegacyOfficers(year);
  const all = await listYearAppointments(year);
  return all.filter((appointment) => appointment.endedAt == null);
}

export async function appointOfficer(
  year: number,
  userId: string,
  title: OfficerTitle,
): Promise<"ok" | "seat_taken" | "already_officer"> {
  const active = await listActiveOfficers(year);
  if (active.some((appointment) => appointment.title === title)) return "seat_taken";
  if (active.some((appointment) => appointment.userId === userId)) return "already_officer";

  await officerAppointmentsCol.doc().set({
    userId,
    year,
    title,
    startedAt: new Date().toISOString(),
    endedAt: null,
  });
  await updateOfficerTitle(userId, title);
  return "ok";
}

export async function vacateOfficer(year: number, title: OfficerTitle) {
  const active = await listActiveOfficers(year);
  const seat = active.find((appointment) => appointment.title === title);
  if (!seat) return;
  await officerAppointmentsCol.doc(seat.id).update({ endedAt: new Date().toISOString() });
  await updateOfficerTitle(seat.userId, null);
}

/** 해가 바뀔 때 그해 임원 직책을 끝낸다. */
export async function endOfficerYear(year: number) {
  const active = await listActiveOfficers(year);
  const endedAt = new Date().toISOString();
  await Promise.all(
    active.map(async (appointment) => {
      await officerAppointmentsCol.doc(appointment.id).update({ endedAt });
      await updateOfficerTitle(appointment.userId, null);
    }),
  );
}
