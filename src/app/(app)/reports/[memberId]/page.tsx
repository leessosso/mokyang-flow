import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PastoralThread } from "@/components/pastoral-thread";
import { Card, CardHeader } from "@/components/ui";
import { Role } from "@/generated/prisma/client";
import {
  isPastorOrAdmin,
  leaderCanAccessMember,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ReportThreadPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const session = await auth();
  const user = session!.user;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      group: { include: { currentLeader: true } },
      pastoralThread: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { author: true },
          },
        },
      },
    },
  });
  if (!member) notFound();

  if (user.role === Role.LEADER) {
    const ok = await leaderCanAccessMember(user.id, memberId);
    if (!ok) notFound();
  } else if (!isPastorOrAdmin(user.role)) {
    notFound();
  }

  const messages =
    member.pastoralThread?.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: { name: m.author.name, role: m.author.role },
    })) ?? [];

  return (
    <div className="space-y-4">
      <Link href="/reports" className="text-sm text-stone-600 underline">← 양육 보고 목록</Link>
      <Card className="p-4 sm:p-6">
        <CardHeader
          title={`${member.name} · ${member.group.name}`}
          subtitle={`담당 조장: ${member.group.currentLeader?.name ?? "미배정"}`}
        />
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <PastoralThread
            memberId={member.id}
            memberName={member.name}
            messages={messages}
          />
        </div>
      </Card>
    </div>
  );
}
