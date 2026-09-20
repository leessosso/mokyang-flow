import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { assignMemberToGroup, createMember } from "@/app/actions";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { formatDateKo, termLabel } from "@/lib/format";
import {
  getGroupById,
  listAllMembers,
  listLeaderTermsByGroup,
  listMembersByGroup,
} from "@/lib/store/groups";
import { getUsersByIds } from "@/lib/store/users";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const group = await getGroupById(id);
  if (!group) notFound();

  const [members, leaderTerms, allMembers] = await Promise.all([
    listMembersByGroup(id),
    listLeaderTermsByGroup(id),
    canAdmin ? listAllMembers() : Promise.resolve([]),
  ]);

  const leaders = await getUsersByIds([
    group.currentLeaderId ?? "",
    ...leaderTerms.map((t) => t.leaderId),
  ]);
  const currentLeaderName = group.currentLeaderId ? leaders.get(group.currentLeaderId)?.name : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/groups" className="text-sm text-stone-600 underline">← 가족 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{group.name}</h2>
        <p className="text-sm text-stone-600">
          {termLabel({ year: group.year, half: group.half })} · 가장: {currentLeaderName ?? "미배정"}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="가족원" />
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <span className="font-medium">{m.name}</span>
              <Link href={`/reports/${id}`} className="text-sm text-stone-700 underline">
                가족 보고
              </Link>
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">가족원이 없습니다.</li>
          )}
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
            <h3 className="text-sm font-medium">가족원 추가</h3>
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
          <CardHeader title="가족원 소속 변경" subtitle="다른 가족에서 이 가족으로 이동" />
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
                    <Button type="submit" variant="secondary">이 가족으로 배정</Button>
                  </form>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="가장 이력" subtitle="상반기·하반기 가장 구성" />
        <ul className="divide-y divide-stone-100 text-sm">
          {leaderTerms.map((t) => (
            <li key={t.id} className="px-4 py-3 sm:px-5">
              <span className="font-medium">{leaders.get(t.leaderId)?.name ?? "알 수 없음"}</span>
              <span className="text-stone-500">
                {" "}
                · {termLabel({ year: t.year, half: t.half })} · {formatDateKo(t.startedAt)}
                {t.endedAt ? ` ~ ${formatDateKo(t.endedAt)}` : " ~ 현재"}
              </span>
            </li>
          ))}
          {leaderTerms.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">이력이 없습니다.</li>
          )}
        </ul>
      </Card>
      </div>
    </div>
  );
}
