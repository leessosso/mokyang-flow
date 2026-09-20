/** 로그인 계정 역할. 목사/관리자는 시스템 전체, LEADER는 현장 리더(가장 또는 임원, 겸임 가능). */
export type Role = "PASTOR" | "LEADER" | "ADMIN";

export const ROLES: Role[] = ["PASTOR", "LEADER", "ADMIN"];

/** 2청년회 임원 8직책. 가장을 겸임할 수 있다. */
export const OFFICER_TITLES = [
  "회장",
  "부회장",
  "총무",
  "부총무",
  "서기",
  "부서기",
  "회계",
  "부회계",
] as const;

export type OfficerTitle = (typeof OFFICER_TITLES)[number];

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  officerTitle: OfficerTitle | null;
  createdAt: string;
};

/** 가족 (구 "조"). 상하반기마다 새로 구성한다. */
export type Group = {
  id: string;
  name: string;
  description: string | null;
  currentLeaderId: string | null;
  year: number;
  half: "H1" | "H2";
};

/** 가족원 (구 "조원") */
export type Member = {
  id: string;
  groupId: string;
  name: string;
  phone: string | null;
  createdAt: string;
};

/** 가장 임기. 원칙적으로 상반기·하반기 각 1회. */
export type GroupLeaderTerm = {
  id: string;
  groupId: string;
  leaderId: string;
  year: number;
  half: "H1" | "H2";
  startedAt: string;
  endedAt: string | null;
};

export type MeetingAssetKind = "LESSON" | "LESSON_COMMENTARY" | "SCORE";

/** 리더 모임 자료 (교안/해설지/악보) */
export type MeetingAsset = {
  id: string;
  meetingId: string;
  kind: MeetingAssetKind;
  fileName: string;
  storageKey: string;
  uploadedById: string;
  createdAt: string;
};

/** 리더 모임 (구 LeaderMeeting) */
export type LeaderMeeting = {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  prayerLeaderId: string | null;
  createdAt: string;
};

export type SharingPlan = {
  id: string;
  meetingId: string | null;
  serviceDate: string;
  useHomeGroups: boolean;
};

export type SharingGroup = {
  id: string;
  planId: string;
  name: string;
  homeGroupId: string | null;
};

export type SharingAssignment = {
  id: string;
  sharingGroupId: string;
  memberId: string;
};

export type WorshipService = {
  id: string;
  date: string;
  title: string;
};

export type SeatingZone = {
  id: string;
  serviceId: string;
  name: string;
  sortOrder: number;
  gridRow: number | null;
  gridCol: number | null;
};

export type SeatingAssignment = {
  id: string;
  serviceId: string;
  zoneId: string;
  groupId: string;
};

/** 가족 보고 방 (가족당 1개, 구 PastoralThread) */
export type PastoralThread = {
  id: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
};

/** 가족 보고 메시지. aboutMemberId가 있으면 특정 가족원 관련 글. */
export type PastoralMessage = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  aboutMemberId: string | null;
  createdAt: string;
};

export function isPastorOrAdmin(role: Role) {
  return role === "PASTOR" || role === "ADMIN";
}

/** 출석 상태. 참석과 방송은 배타적(하나만 켠다), 결석은 둘 다 꺼진 상태. */
export type AttendanceStatus = "present" | "broadcast" | "none";

export type AttendanceServiceMark = {
  status: AttendanceStatus;
  /** 교회 QR 출입 시스템 명단 업로드로만 켜진다. 목사/관리자는 예외적으로 수동 수정 가능. */
  qr: boolean;
};

/** 주일 (출석을 여는 단위) */
export type AttendanceSunday = {
  id: string;
  date: string;
  title: string;
  createdAt: string;
};

/** 가족원 1명의 그 주일 출석. 문서 id는 `{sundayId}_{memberId}`. */
export type AttendanceMark = {
  id: string;
  sundayId: string;
  memberId: string;
  groupId: string;
  s13: AttendanceServiceMark;
  s4: AttendanceServiceMark;
  /** 4부 이후 가족모임 참석 여부. 예배 부와 무관하게 하루에 한 번만 체크한다. */
  familyMeeting: boolean;
  updatedAt: string;
  updatedById: string;
};

export type SurveyQuestionType = "yesno" | "number" | "text";

export type SurveyQuestion = {
  id: string;
  label: string;
  type: SurveyQuestionType;
};

/** 이벤트 참여조사 (식수 조사 등 일회성 조사) */
export type EventSurvey = {
  id: string;
  title: string;
  eventDate: string;
  description: string | null;
  status: "open" | "closed";
  questions: SurveyQuestion[];
  createdAt: string;
};

/** 가족원 1명의 조사 응답. 문서 id는 `{surveyId}_{memberId}`. */
export type EventResponse = {
  id: string;
  surveyId: string;
  memberId: string;
  groupId: string;
  answers: Record<string, string | number | boolean>;
  updatedAt: string;
  updatedById: string;
};
