import Link from "next/link";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/client";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui";

export default async function ReportsPage() {
  const session = await auth();
  const user = session!.user;

  let members: {
    id: string;
    name: string;
    group: { name: string };
    pastoralThread: { messages: { createdAt: Date }[] } | null;
  }[] = [];

  if (isPastorOrAdmin(user.role)) {
    members = await prisma.member.findMany({
      include: {
        group: true,
        pastoralThread: {
          include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
        },
      },
      orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
    });
  } else if (user.role === Role.LEADER) {
    const group = await prisma.group.findFirst({
      where: { currentLeaderId: user.id },
    });
    if (group) {
      members = await prisma.member.findMany({
        where: { groupId: group.id },
        include: {
          group: true,
          pastoralThread: {
            include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
          },
        },
        orderBy: { name: "asc" },
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">양육 보고</h2>
        <p className="text-sm text-stone-600">
          조원별 비공개 스레드 — 해당 조장과 목사만 열람할 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader title="조원 목록" />
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.id} className="px-4 py-3 sm:px-5">
              <Link href={`/reports/${m.id}`} className="block">
                <p className="font-medium text-stone-900">
                  {m.name}{" "}
                  <span className="text-sm font-normal text-stone-500">({m.group.name})</span>
                </p>
                {m.pastoralThread?.messages[0] ? (
                  <p className="mt-1 line-clamp-1 text-sm text-stone-500">
                    최근 메시지 있음
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-stone-400">아직 보고 없음</p>
                )}
              </Link>
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">표시할 조원이 없습니다.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
