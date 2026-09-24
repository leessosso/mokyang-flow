import "dotenv/config";
import { getDb } from "../src/lib/firebase-admin";
import { hashPassword } from "../src/lib/password";

const COLLECTIONS = [
  "pastoralMessages",
  "pastoralThreads",
  "seatingAssignments",
  "seatingZones",
  "worshipServices",
  "meetingAssets",
  "leaderMeetings",
  "groupLeaderTerms",
  "members",
  "groups",
  "users",
  "settings",
];

async function clearAll() {
  for (const name of COLLECTIONS) {
    const snap = await getDb().collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

async function main() {
  await clearAll();

  const passwordHash = await hashPassword("demo1234");
  const now = new Date().toISOString();

  async function addUser(data: {
    email: string;
    name: string;
    role: "PASTOR" | "LEADER" | "ADMIN";
    officerTitle?: string | null;
    servingDutyKeys?: string[];
  }) {
    const ref = getDb().collection("users").doc();
    await ref.set({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
      officerTitle: data.officerTitle ?? null,
      ...(data.servingDutyKeys?.length ? { servingDutyKeys: data.servingDutyKeys } : {}),
      createdAt: now,
    });
    return ref.id;
  }

  const pastorId = await addUser({ email: "pastor@church.demo", name: "김목사", role: "PASTOR" });
  const leader1Id = await addUser({ email: "leader1@church.demo", name: "이가장", role: "LEADER" });
  const leader2Id = await addUser({
    email: "leader2@church.demo",
    name: "박가장",
    role: "LEADER",
    officerTitle: "회장",
    servingDutyKeys: ["prayer_meeting_lead"],
  });
  const leader3Id = await addUser({ email: "leader3@church.demo", name: "최신가장", role: "LEADER" });
  const officerOnlyId = await addUser({
    email: "officer1@church.demo",
    name: "정총무",
    role: "LEADER",
    officerTitle: "총무",
  });

  await getDb().collection("settings").doc("app").set({ year: 2026, half: "H1" });

  async function addGroup(name: string, description: string, currentLeaderId: string, year: number, half: "H1" | "H2") {
    const ref = getDb().collection("groups").doc();
    await ref.set({ name, description, currentLeaderId, year, half });
    return ref.id;
  }

  const g1Id = await addGroup("1가족", "주중 모임 화요일", leader1Id, 2026, "H1");
  const g2Id = await addGroup("2가족", "주중 모임 수요일", leader2Id, 2026, "H1");
  const g3Id = await addGroup("3가족", "주중 모임 목요일", leader3Id, 2026, "H1");
  const g3PrevId = await addGroup("3가족", "2025 하반기", leader1Id, 2025, "H2");

  const termStart = "2025-01-01T00:00:00.000Z";
  for (const [groupId, leaderId] of [
    [g1Id, leader1Id],
    [g2Id, leader2Id],
    [g3Id, leader3Id],
  ] as const) {
    await getDb().collection("groupLeaderTerms").doc().set({
      groupId,
      leaderId,
      year: 2026,
      half: "H1",
      startedAt: termStart,
      endedAt: null,
    });
  }

  // 2025 하반기 3가족 가장 (학기 재구성 데모)
  await getDb().collection("groupLeaderTerms").doc().set({
    groupId: g3PrevId,
    leaderId: leader1Id,
    year: 2025,
    half: "H2",
    startedAt: "2025-07-01T00:00:00.000Z",
    endedAt: "2025-12-31T00:00:00.000Z",
  });

  async function addMember(groupId: string, name: string) {
    const ref = getDb().collection("members").doc();
    await ref.set({ groupId, name, phone: null, createdAt: now });
    return ref.id;
  }

  const membersData: [string, string][] = [
    [g1Id, "김민수"],
    [g1Id, "정하늘"],
    [g1Id, "오지훈"],
    [g1Id, "한소영"],
    [g2Id, "윤서준"],
    [g2Id, "강예린"],
    [g2Id, "임도현"],
    [g3Id, "신유나"],
    [g3Id, "배준호"],
    [g3Id, "류하은"],
  ];
  const memberIds: Record<string, string> = {};
  for (const [groupId, name] of membersData) {
    memberIds[name] = await addMember(groupId, name);
  }

  // 가족 보고: 1가족 방 하나에 가족원 태그된 메시지 2건
  const threadRef = getDb().collection("pastoralThreads").doc();
  await threadRef.set({ groupId: g1Id, createdAt: now, updatedAt: now });
  await getDb().collection("pastoralMessages").doc().set({
    threadId: threadRef.id,
    authorId: leader1Id,
    body: "민수 형제가 최근 직장 스트레스로 예배 참석이 불규칙합니다. 기도 부탁드립니다.",
    aboutMemberId: memberIds["김민수"],
    createdAt: now,
  });
  await getDb().collection("pastoralMessages").doc().set({
    threadId: threadRef.id,
    authorId: pastorId,
    body: "함께 기도하겠습니다. 다음 주에 가볍게 만나 뵙는 것도 좋겠습니다.",
    aboutMemberId: null,
    createdAt: now,
  });

  // 리더 모임
  const meetingRef = getDb().collection("leaderMeetings").doc();
  await meetingRef.set({
    title: "3월 1주 리더 모임",
    date: "2026-03-05T19:30:00.000Z",
    notes: "교안 나눔 및 이번 달 가족 사역 나눔",
    prayerLeaderId: leader2Id,
    dutyUserIds: { prayer_meeting_lead: leader2Id },
    createdAt: now,
  });

  // 주일 예배 좌석
  const serviceRef = getDb().collection("worshipServices").doc();
  await serviceRef.set({ date: "2026-03-09T11:00:00.000Z", title: "주일 2부 예배" });

  const zoneNames = ["좌측 A구역", "중앙 B구역", "우측 C구역", "발코니 D구역"];
  const zoneIds: string[] = [];
  for (let i = 0; i < zoneNames.length; i++) {
    const zoneRef = getDb().collection("seatingZones").doc();
    await zoneRef.set({
      serviceId: serviceRef.id,
      name: zoneNames[i],
      sortOrder: i,
      gridRow: Math.floor(i / 2),
      gridCol: i % 2,
    });
    zoneIds.push(zoneRef.id);
  }

  await getDb().collection("seatingAssignments").doc().set({ serviceId: serviceRef.id, zoneId: zoneIds[0], groupId: g1Id });
  await getDb().collection("seatingAssignments").doc().set({ serviceId: serviceRef.id, zoneId: zoneIds[1], groupId: g2Id });
  await getDb().collection("seatingAssignments").doc().set({ serviceId: serviceRef.id, zoneId: zoneIds[2], groupId: g3Id });

  console.log("시드 완료");
  console.log("목사:", "pastor@church.demo", "/ demo1234");
  console.log("1가족 가장:", "leader1@church.demo");
  console.log("2가족 가장(회장 겸임):", "leader2@church.demo");
  console.log("3가족 가장(인수인계 후):", "leader3@church.demo");
  console.log("임원 전용(총무, 가족 없음):", "officer1@church.demo");
  void officerOnlyId;
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
