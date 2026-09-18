import "dotenv/config";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { createSqliteAdapter } from "../src/lib/prisma-sqlite";

const prisma = new PrismaClient({ adapter: createSqliteAdapter() });

async function main() {
  await prisma.pastoralMessage.deleteMany();
  await prisma.pastoralThread.deleteMany();
  await prisma.sharingAssignment.deleteMany();
  await prisma.sharingGroup.deleteMany();
  await prisma.sharingPlan.deleteMany();
  await prisma.seatingAssignment.deleteMany();
  await prisma.seatingZone.deleteMany();
  await prisma.worshipService.deleteMany();
  await prisma.leaderMeeting.deleteMany();
  await prisma.groupLeaderTerm.deleteMany();
  await prisma.member.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword("demo1234");

  const pastor = await prisma.user.create({
    data: {
      email: "pastor@church.demo",
      passwordHash,
      name: "김목사",
      role: Role.PASTOR,
    },
  });

  const leader1 = await prisma.user.create({
    data: {
      email: "leader1@church.demo",
      passwordHash,
      name: "이조장",
      role: Role.LEADER,
    },
  });

  const leader2 = await prisma.user.create({
    data: {
      email: "leader2@church.demo",
      passwordHash,
      name: "박조장",
      role: Role.LEADER,
    },
  });

  const leader3 = await prisma.user.create({
    data: {
      email: "leader3@church.demo",
      passwordHash,
      name: "최신조장",
      role: Role.LEADER,
    },
  });

  const g1 = await prisma.group.create({
    data: {
      name: "1조",
      description: "주중 모임 화요일",
      currentLeaderId: leader1.id,
    },
  });

  const g2 = await prisma.group.create({
    data: {
      name: "2조",
      description: "주중 모임 수요일",
      currentLeaderId: leader2.id,
    },
  });

  const g3 = await prisma.group.create({
    data: {
      name: "3조",
      description: "주중 모임 목요일",
      currentLeaderId: leader3.id,
    },
  });

  const termStart = new Date("2025-01-01");
  for (const [group, leader] of [
    [g1, leader1],
    [g2, leader2],
    [g3, leader3],
  ] as const) {
    await prisma.groupLeaderTerm.create({
      data: {
        groupId: group.id,
        leaderId: leader.id,
        startedAt: termStart,
      },
    });
  }

  // 3조는 이전 조장 이력 (인수인계 데모용)
  await prisma.groupLeaderTerm.create({
    data: {
      groupId: g3.id,
      leaderId: leader1.id,
      startedAt: new Date("2023-03-01"),
      endedAt: new Date("2024-12-31"),
    },
  });

  const membersData = [
    { name: "김민수", groupId: g1.id },
    { name: "정하늘", groupId: g1.id },
    { name: "오지훈", groupId: g1.id },
    { name: "한소영", groupId: g1.id },
    { name: "윤서준", groupId: g2.id },
    { name: "강예린", groupId: g2.id },
    { name: "임도현", groupId: g2.id },
    { name: "신유나", groupId: g3.id },
    { name: "배준호", groupId: g3.id },
    { name: "류하은", groupId: g3.id },
  ];

  const members = await Promise.all(
    membersData.map((m) => prisma.member.create({ data: m })),
  );

  const thread = await prisma.pastoralThread.create({
    data: { memberId: members[0].id },
  });
  await prisma.pastoralMessage.create({
    data: {
      threadId: thread.id,
      authorId: leader1.id,
      body: "민수 형제가 최근 직장 스트레스로 예배 참석이 불규칙합니다. 기도 부탁드립니다.",
    },
  });
  await prisma.pastoralMessage.create({
    data: {
      threadId: thread.id,
      authorId: pastor.id,
      body: "함께 기도하겠습니다. 다음 주에 가볍게 만나 뵙는 것도 좋겠습니다.",
    },
  });

  const meeting = await prisma.leaderMeeting.create({
    data: {
      title: "3월 1주 조장 모임",
      date: new Date("2026-03-05T19:30:00"),
      notes: "나눔 조편성 및 이번 달 양육 사역 나눔",
    },
  });

  const plan = await prisma.sharingPlan.create({
    data: {
      meetingId: meeting.id,
      serviceDate: new Date("2026-03-05"),
      useHomeGroups: false,
    },
  });

  const sg1 = await prisma.sharingGroup.create({
    data: { planId: plan.id, name: "나눔조 A" },
  });
  const sg2 = await prisma.sharingGroup.create({
    data: { planId: plan.id, name: "나눔조 B" },
  });
  for (let i = 0; i < 5; i++) {
    await prisma.sharingAssignment.create({
      data: {
        sharingGroupId: i % 2 === 0 ? sg1.id : sg2.id,
        memberId: members[i].id,
      },
    });
  }

  const service = await prisma.worshipService.create({
    data: {
      date: new Date("2026-03-09T11:00:00"),
      title: "주일 2부 예배",
    },
  });

  const zones = await Promise.all(
    ["좌측 A구역", "중앙 B구역", "우측 C구역", "발코니 D구역"].map((name, i) =>
      prisma.seatingZone.create({
        data: {
          serviceId: service.id,
          name,
          sortOrder: i,
          gridRow: Math.floor(i / 2),
          gridCol: i % 2,
        },
      }),
    ),
  );

  await prisma.seatingAssignment.create({
    data: { serviceId: service.id, zoneId: zones[0].id, groupId: g1.id },
  });
  await prisma.seatingAssignment.create({
    data: { serviceId: service.id, zoneId: zones[1].id, groupId: g2.id },
  });
  await prisma.seatingAssignment.create({
    data: { serviceId: service.id, zoneId: zones[2].id, groupId: g3.id },
  });

  console.log("시드 완료");
  console.log("목사:", pastor.email, "/ demo1234");
  console.log("1조 조장:", leader1.email);
  console.log("2조 조장:", leader2.email);
  console.log("3조 조장(인수인계 후):", leader3.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
