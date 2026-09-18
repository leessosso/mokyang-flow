import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assignMemberToGroup, createMember } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateKo } from "@/lib/format";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      currentLeader: true,
      members: { orderBy: { name: "asc" } },
      leaderTerms: {
        include: { leader: true },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (!group) notFound();

  const allMembers = canAdmin
    ? await prisma.member.findMany({ orderBy: { name: "asc" } })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/groups" className="text-sm text-stone-600 underline">← 조 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{group.name}</h2>
        <p className="text-sm text-stone-600">조장: {group.currentLeader?.name ?? "미배정"}</p>
      </div>

      <Card>
        <CardHeader title="조원" />
        <ul className="divide-y divide-stone-100">
          {group.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <span className="font-medium">{m.name}</span>
              <Link href={`/reports/${m.id}`} className="text-sm text-stone-700 underline">
                양육 보고
              </Link>
            </li>
          ))}
        </ul>
        {(canAdmin || group.currentLeaderId === session!.user.id) && (
          <form
            action={async (fd) => {
              "use server";
              await createMember(
                id,
                fd.get("name") as string,
                (fd.get("phone") as string) || undefined,
              );
            }}
            className="border-t border-stone-100 p-4 sm:p-5"
          >
            <h3 className="text-sm font-medium">조원 추가</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Input name="name" required placeholder="이름" />
              <Input name="phone" placeholder="연락처" />
              <Button type="submit">추가</Button>
            </div>
          </form>
        )}
      </Card>

      {canAdmin && (
        <Card>
          <CardHeader title="조원 소속 변경" subtitle="다른 조에서 이 조로 이동" />
          <ul className="divide-y divide-stone-100">
            {allMembers
              .filter((m) => m.groupId !== id)
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm sm:px-5">
                  <span>{m.name}</span>
                  <form
                    action={async () => {
                      "use server";
                      await assignMemberToGroup(m.id, id);
                    }}
                  >
                    <Button type="submit" variant="secondary">이 조로 배정</Button>
                  </form>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="조장 이력" subtitle="인수인계 감사 로그" />
        <ul className="divide-y divide-stone-100 text-sm">
          {group.leaderTerms.map((t) => (
            <li key={t.id} className="px-4 py-3 sm:px-5">
              <span className="font-medium">{t.leader.name}</span>
              <span className="text-stone-500">
                {" "}
                · {formatDateKo(t.startedAt)}
                {t.endedAt ? ` ~ ${formatDateKo(t.endedAt)}` : " ~ 현재"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
