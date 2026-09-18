import Link from "next/link";
import { auth } from "@/auth";
import { Badge, Card, CardHeader } from "@/components/ui";
import { Role } from "@/generated/prisma/client";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateKo, formatDateTimeKo, roleLabel } from "@/lib/format";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  const upcomingMeetings = await prisma.leaderMeeting.findMany({
    orderBy: { date: "desc" },
    take: 3,
    include: { sharingPlan: true },
  });

  const nextService = await prisma.worshipService.findFirst({
    orderBy: { date: "desc" },
    include: { assignments: { include: { group: true, zone: true } } },
  });

  let myGroup = null;
  if (user.role === Role.LEADER) {
    myGroup = await prisma.group.findFirst({
      where: { currentLeaderId: user.id },
      include: { members: true },
    });
  }

  const reportCount = isPastorOrAdmin(user.role)
    ? await prisma.pastoralThread.count()
    : myGroup
      ? await prisma.pastoralThread.count({
          where: { member: { groupId: myGroup.id } },
        })
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">안녕하세요, {user.name}님</h2>
        <p className="mt-1 text-sm text-stone-600">
          역할: {roleLabel(user.role)} · 양육 보고 스레드 {reportCount}건
        </p>
      </div>

      {myGroup && (
        <Card>
          <CardHeader title={`내 조: ${myGroup.name}`} subtitle={myGroup.description ?? undefined} />
          <div className="px-4 py-3 sm:px-5">
            <p className="text-sm text-stone-600">조원 {myGroup.members.length}명</p>
            <Link href="/my-group" className="mt-2 inline-block text-sm font-medium text-stone-800 underline">
              조원·양육 보고 관리
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="최근 조장 모임" subtitle="나눔 조편성 연결" />
        <ul className="divide-y divide-stone-100">
          {upcomingMeetings.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <div>
                <p className="font-medium text-stone-900">{m.title}</p>
                <p className="text-sm text-stone-500">{formatDateTimeKo(m.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                {m.sharingPlan ? (
                  <Badge tone="green">조편성 완료</Badge>
                ) : (
                  <Badge>조편성 없음</Badge>
                )}
                <Link href={`/meetings/${m.id}`} className="text-sm text-stone-700 underline">
                  보기
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {nextService && (
        <Card>
          <CardHeader
            title={nextService.title}
            subtitle={formatDateKo(nextService.date)}
          />
          <div className="px-4 py-3 sm:px-5">
            <p className="text-sm text-stone-600">
              배치된 조 {nextService.assignments.length}개
            </p>
            <Link href={`/worship/${nextService.id}`} className="mt-2 inline-block text-sm font-medium text-stone-800 underline">
              좌석 배치 보기
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
