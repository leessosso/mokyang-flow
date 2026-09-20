import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createMember } from "@/app/actions";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { getGroupByCurrentLeader, listMembersByGroup } from "@/lib/store/groups";
import { getLatestMessageByGroup } from "@/lib/store/reports";

export default async function MyGroupPage() {
  const session = await auth();
  if (session!.user.role !== "LEADER") redirect("/dashboard");

  const group = await getGroupByCurrentLeader(session!.user.id);

  if (!group) {
    return (
      <Card className="p-6 text-center text-stone-600">
        현재 담당 가족이 없습니다. 목사에게 가장 배정을 요청해 주세요.
      </Card>
    );
  }

  const [members, latestMessage] = await Promise.all([
    listMembersByGroup(group.id),
    getLatestMessageByGroup(group.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{group.name}</h2>
        <p className="text-sm text-stone-600">{group.description}</p>
      </div>

      <Card>
        <CardHeader title="가족원" subtitle="가족원을 태그해 목사와의 비공개 방에 현황을 남길 수 있습니다" />
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3 sm:px-5">
              <p className="font-medium text-stone-900">{m.name}</p>
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">가족원이 없습니다.</li>
          )}
        </ul>
        <form
          action={async (fd) => {
            "use server";
            await createMember(group.id, fd.get("name") as string);
          }}
          className="flex gap-2 border-t border-stone-100 p-4"
        >
          <Input name="name" required placeholder="새 가족원 이름" />
          <Button type="submit">추가</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="가족 보고" subtitle="목사님과 나누는 한 방입니다" />
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            {latestMessage ? (
              <p className="line-clamp-2 text-sm text-stone-500">최근: {latestMessage.body}</p>
            ) : (
              <p className="text-sm text-stone-400">아직 보고가 없습니다.</p>
            )}
          </div>
          <Link
            href={`/reports/${group.id}`}
            className="shrink-0 rounded-lg bg-stone-800 px-3 py-2 text-sm text-white"
          >
            보고 작성
          </Link>
        </div>
      </Card>
    </div>
  );
}
