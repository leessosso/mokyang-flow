import { kstDateKeyFromIso } from "@/lib/kst-date";
import {
  attendanceMarksCol,
  attendanceSundaysCol,
  withId,
} from "@/lib/store/collections";
import type {
  AttendanceMark,
  AttendanceServiceMark,
  AttendanceStatus,
  AttendanceSunday,
} from "@/lib/types";

const EMPTY_SERVICE_MARK: AttendanceServiceMark = { status: "none", qr: false };

function markId(sundayId: string, memberId: string) {
  return `${sundayId}_${memberId}`;
}

export async function listAttendanceSundays(): Promise<AttendanceSunday[]> {
  const snap = await attendanceSundaysCol.get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getAttendanceSundayById(id: string): Promise<AttendanceSunday | null> {
  const doc = await attendanceSundaysCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function getLatestAttendanceSunday(): Promise<AttendanceSunday | null> {
  const sundays = await listAttendanceSundays();
  return sundays[0] ?? null;
}

/** 서울 달력 날짜(YYYY-MM-DD)와 일치하는 주일 출석 문서. */
export async function getAttendanceSundayByKstDateKey(
  dateKey: string,
): Promise<AttendanceSunday | null> {
  const sundays = await listAttendanceSundays();
  return sundays.find((s) => kstDateKeyFromIso(s.date) === dateKey) ?? null;
}

export async function createAttendanceSunday(date: string, title: string): Promise<AttendanceSunday> {
  const ref = attendanceSundaysCol.doc();
  const sunday: Omit<AttendanceSunday, "id"> = {
    date,
    title,
    createdAt: new Date().toISOString(),
  };
  await ref.set(sunday);
  return { id: ref.id, ...sunday };
}

export async function listMarksBySunday(sundayId: string): Promise<AttendanceMark[]> {
  const snap = await attendanceMarksCol.where("sundayId", "==", sundayId).get();
  return snap.docs.map(withId);
}

export async function listMarksBySundayAndGroup(
  sundayId: string,
  groupId: string,
): Promise<AttendanceMark[]> {
  const snap = await attendanceMarksCol
    .where("sundayId", "==", sundayId)
    .where("groupId", "==", groupId)
    .get();
  return snap.docs.map(withId);
}

/** 없는 사람은 빈 마크로 채워서, 화면에서 항상 가족원 수만큼 행이 나오게 한다. */
export function markMapByMemberId(marks: AttendanceMark[]): Map<string, AttendanceMark> {
  return new Map(marks.map((m) => [m.memberId, m]));
}

export function emptyServiceMark(): AttendanceServiceMark {
  return { ...EMPTY_SERVICE_MARK };
}

export type SaveMarkEntry = {
  memberId: string;
  groupId: string;
  s13Status: AttendanceStatus;
  s4Status: AttendanceStatus;
  /** 4부 이후 가족모임 참석 여부. 가장·목사 모두 수정할 수 있다. */
  familyMeeting: boolean;
  /** 목사/관리자만 QR을 수동으로 고칠 수 있다. undefined면 기존 값을 유지한다. */
  s13Qr?: boolean;
  s4Qr?: boolean;
};

export async function saveAttendanceMarks(
  sundayId: string,
  entries: SaveMarkEntry[],
  updatedById: string,
): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    entries.map(async (entry) => {
      const id = markId(sundayId, entry.memberId);
      const ref = attendanceMarksCol.doc(id);
      const existing = await ref.get();
      const prev = existing.exists ? existing.data()! : null;

      const s13: AttendanceServiceMark = {
        status: entry.s13Status,
        qr: entry.s13Qr !== undefined ? entry.s13Qr : prev?.s13.qr ?? false,
      };
      const s4: AttendanceServiceMark = {
        status: entry.s4Status,
        qr: entry.s4Qr !== undefined ? entry.s4Qr : prev?.s4.qr ?? false,
      };

      const mark: Omit<AttendanceMark, "id"> = {
        sundayId,
        memberId: entry.memberId,
        groupId: entry.groupId,
        s13,
        s4,
        familyMeeting: entry.familyMeeting,
        updatedAt: now,
        updatedById,
      };
      await ref.set(mark);
    }),
  );
}

export type QrImportResult = {
  matchedNames: string[];
  ambiguousNames: string[];
  unmatchedNames: string[];
};

/** 이름 끝에 붙은 동명이인 구분용 로마자 접미사(박윤호B 등)를 뗀다. */
function stripSuffix(name: string) {
  return name.replace(/[A-Za-z]+$/, "").trim();
}

/**
 * QR 명단(이름 목록)을 가족원과 매칭해 그 부의 qr을 true로 켠다.
 * 참석/방송 상태는 건드리지 않는다. 동명이인·미매칭은 목사가 화면에서 수동 처리한다.
 */
export async function importQrNames(params: {
  sundayId: string;
  service: "s13" | "s4";
  names: string[];
  members: { id: string; groupId: string; name: string }[];
  updatedById: string;
}): Promise<QrImportResult> {
  const { sundayId, service, names, members, updatedById } = params;

  const byExactName = new Map<string, typeof members>();
  const byStrippedName = new Map<string, typeof members>();
  for (const m of members) {
    const exactList = byExactName.get(m.name) ?? [];
    exactList.push(m);
    byExactName.set(m.name, exactList);

    const stripped = stripSuffix(m.name);
    const strippedList = byStrippedName.get(stripped) ?? [];
    strippedList.push(m);
    byStrippedName.set(stripped, strippedList);
  }

  const matchedNames: string[] = [];
  const ambiguousNames: string[] = [];
  const unmatchedNames: string[] = [];
  const matchedMembers: (typeof members)[number][] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;

    let candidates = byExactName.get(name);
    if (!candidates || candidates.length === 0) {
      candidates = byStrippedName.get(stripSuffix(name));
    }

    if (!candidates || candidates.length === 0) {
      unmatchedNames.push(name);
    } else if (candidates.length > 1) {
      ambiguousNames.push(name);
    } else {
      matchedNames.push(name);
      matchedMembers.push(candidates[0]);
    }
  }

  const now = new Date().toISOString();
  await Promise.all(
    matchedMembers.map(async (member) => {
      const id = markId(sundayId, member.id);
      const ref = attendanceMarksCol.doc(id);
      const existing = await ref.get();
      const prev = existing.exists ? existing.data()! : null;

      const base: Omit<AttendanceMark, "id"> = prev ?? {
        sundayId,
        memberId: member.id,
        groupId: member.groupId,
        s13: emptyServiceMark(),
        s4: emptyServiceMark(),
        familyMeeting: false,
        updatedAt: now,
        updatedById,
      };

      const updated: Omit<AttendanceMark, "id"> = {
        ...base,
        groupId: member.groupId,
        [service]: { ...base[service], qr: true },
        updatedAt: now,
        updatedById,
      };
      await ref.set(updated);
    }),
  );

  return { matchedNames, ambiguousNames, unmatchedNames };
}

export type GroupAttendanceTotals = {
  memberCount: number;
  s13: { present: number; broadcast: number; qr: number };
  s4: { present: number; broadcast: number; qr: number };
  /** 4부 이후 가족모임 참석 인원 */
  familyMeeting: number;
};

/** 가족 구분 없이 그 주일의 전체 마크를 그대로 합산한다 (주일 목록 요약용). */
export function summarizeAllMarks(marks: AttendanceMark[]): GroupAttendanceTotals {
  const totals: GroupAttendanceTotals = {
    memberCount: marks.length,
    s13: { present: 0, broadcast: 0, qr: 0 },
    s4: { present: 0, broadcast: 0, qr: 0 },
    familyMeeting: 0,
  };
  for (const mark of marks) {
    if (mark.s13.status === "present") totals.s13.present += 1;
    if (mark.s13.status === "broadcast") totals.s13.broadcast += 1;
    if (mark.s13.qr) totals.s13.qr += 1;
    if (mark.s4.status === "present") totals.s4.present += 1;
    if (mark.s4.status === "broadcast") totals.s4.broadcast += 1;
    if (mark.s4.qr) totals.s4.qr += 1;
    if (mark.familyMeeting) totals.familyMeeting += 1;
  }
  return totals;
}

export function summarizeMarks(
  memberIds: string[],
  marks: Map<string, AttendanceMark>,
): GroupAttendanceTotals {
  const totals: GroupAttendanceTotals = {
    memberCount: memberIds.length,
    s13: { present: 0, broadcast: 0, qr: 0 },
    s4: { present: 0, broadcast: 0, qr: 0 },
    familyMeeting: 0,
  };
  for (const memberId of memberIds) {
    const mark = marks.get(memberId);
    if (!mark) continue;
    if (mark.s13.status === "present") totals.s13.present += 1;
    if (mark.s13.status === "broadcast") totals.s13.broadcast += 1;
    if (mark.s13.qr) totals.s13.qr += 1;
    if (mark.s4.status === "present") totals.s4.present += 1;
    if (mark.s4.status === "broadcast") totals.s4.broadcast += 1;
    if (mark.s4.qr) totals.s4.qr += 1;
    if (mark.familyMeeting) totals.familyMeeting += 1;
  }
  return totals;
}
