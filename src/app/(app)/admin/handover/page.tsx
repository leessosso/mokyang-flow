import { auth } from "@/auth";
import { handoverLeader } from "@/app/actions";
import { Button, Card, CardHeader, Label } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateKo } from "@/lib/format";
import { redirect } from "next/navigation";

export default async function HandoverPage() {
  const session = await auth();
  if (!isPastorOrAdmin(session!.user.role)) redirect("/dashboard");

  const groups = await prisma.group.findMany({
    include: {
      currentLeader: true,
      leaderTerms: {
        include: { leader: true },
        orderBy: { startedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { name: "asc" },
  });

  const leaders = await prisma.user.findMany({
    where: { role: "LEADER" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">조장 인수인계</h2>
        <p className="text-sm text-stone-600">
          조장 임기 종료 시 새 조장을 임명합니다. 조원·양육 보고 스레드는 조원 기준으로 유지되며 새 조장이 열람할 수 있습니다.
        </p>
      </div>

      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader
            title={g.name}
            subtitle={`현재 조장: ${g.currentLeader?.name ?? "미배정"}`}
          />
          <div className="space-y-4 p-4 sm:p-5">
            <form
              action={async (fd) => {
                "use server";
                await handoverLeader(g.id, fd.get("leaderId") as string);
              }}
              className="flex flex-wrap items-end gap-3"
            >
              <div>
                <Label>새 조장</Label>
                <select
                  name="leaderId"
                  className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>선택</option>
                  {leaders
                    .filter((l) => l.id !== g.currentLeaderId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.email})</option>
                    ))}
                </select>
              </div>
              <Button type="submit">인수인계 실행</Button>
            </form>
            <div>
              <p className="text-xs font-medium uppercase text-stone-500">이력</p>
              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                {g.leaderTerms.map((t) => (
                  <li key={t.id}>
                    {t.leader.name} · {formatDateKo(t.startedAt)}
                    {t.endedAt ? ` ~ ${formatDateKo(t.endedAt)}` : " ~ 현재"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
