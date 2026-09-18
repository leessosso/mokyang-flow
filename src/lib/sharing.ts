import { prisma } from "@/lib/db";

/** 균형 잡힌 임시 나눔 조 자동 배치 (조별 인원 수 균등화) */
export async function autoSuggestSharingGroups(planId: string, groupCount: number) {
  const plan = await prisma.sharingPlan.findUnique({
    where: { id: planId },
    include: {
      tempGroups: { include: { assignments: true } },
      meeting: true,
    },
  });
  if (!plan) throw new Error("NOT_FOUND");

  const members = await prisma.member.findMany({
    include: { group: true },
    orderBy: { name: "asc" },
  });

  if (plan.useHomeGroups) {
    const groups = await prisma.group.findMany({
      include: { members: true },
      orderBy: { name: "asc" },
    });
    await prisma.sharingAssignment.deleteMany({
      where: { sharingGroup: { planId } },
    });
    await prisma.sharingGroup.deleteMany({ where: { planId } });

    for (const g of groups) {
      const sg = await prisma.sharingGroup.create({
        data: {
          planId,
          name: `${g.name} (본조)`,
          homeGroupId: g.id,
        },
      });
      for (const m of g.members) {
        await prisma.sharingAssignment.create({
          data: { sharingGroupId: sg.id, memberId: m.id },
        });
      }
    }
    return;
  }

  const shuffled = [...members].sort(() => Math.random() - 0.5);
  const count = Math.max(2, Math.min(groupCount, shuffled.length));

  await prisma.sharingAssignment.deleteMany({
    where: { sharingGroup: { planId } },
  });
  await prisma.sharingGroup.deleteMany({ where: { planId } });

  const tempGroups = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      prisma.sharingGroup.create({
        data: { planId, name: `나눔조 ${i + 1}` },
      }),
    ),
  );

  await Promise.all(
    shuffled.map((member, index) =>
      prisma.sharingAssignment.create({
        data: {
          sharingGroupId: tempGroups[index % count].id,
          memberId: member.id,
        },
      }),
    ),
  );
}
