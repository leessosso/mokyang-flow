import Link from "next/link";
import { auth } from "@/auth";
import { createGroup } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function GroupsPage() {
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const groups = await prisma.group.findMany({
    include: {
      currentLeader: true,
      members: true,
      leaderTerms: { orderBy: { startedAt: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">조 관리</h2>
        <p className="text-sm text-stone-600">본조(홈 그룹)와 조장·조원을 관리합니다.</p>
      </div>

      {canAdmin && (
        <Card className="p-4 sm:p-5">
          <h3 className="font-medium text-stone-900">새 조 추가</h3>
          <form
            action={async (fd) => {
              "use server";
              await createGroup(
                fd.get("name") as string,
                (fd.get("description") as string) || undefined,
              );
            }}
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            <div>
              <Label>조 이름</Label>
              <Input name="name" required placeholder="4조" />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea name="description" placeholder="모임 요일 등" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">추가</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardHeader
              title={g.name}
              subtitle={g.description ?? "설명 없음"}
            />
            <div className="space-y-2 px-4 py-3 text-sm sm:px-5">
              <p>
                <span className="text-stone-500">조장:</span>{" "}
                {g.currentLeader?.name ?? "미배정"}
              </p>
              <p>
                <span className="text-stone-500">조원:</span> {g.members.length}명
              </p>
              <Link href={`/groups/${g.id}`} className="inline-block font-medium text-stone-800 underline">
                상세 보기
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
