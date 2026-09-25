import Link from "next/link";
import { redirect } from "next/navigation";
import { handoverLeader, startNextFamilyTerm, updateOfficerTitle } from "@/app/actions";
import { Button, Card, CardHeader, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo, termLabel } from "@/lib/format";
import { listAllGroups, listGroups, listLeaderTermsByGroup } from "@/lib/store/groups";
import { getCurrentTerm } from "@/lib/store/settings";
import { listUsersByRole } from "@/lib/store/users";
import { getUsersByIds } from "@/lib/store/users";
import { nextTerm, sameTerm } from "@/lib/term";
import { OFFICER_TITLES } from "@/lib/types";

export default async function HandoverPage() {
  if (!(await currentUserCanManageApp())) redirect("/dashboard");

  const [term, groups, allGroups, leaders] = await Promise.all([
    getCurrentTerm(),
    listGroups(),
    listAllGroups(),
    listUsersByRole("LEADER"),
  ]);
  const upcoming = nextTerm(term);
  const pastGroups = allGroups.filter((g) => !sameTerm({ year: g.year, half: g.half }, term));

  const groupsWithTerms = await Promise.all(
    groups.map(async (g) => ({
      group: g,
      terms: (await listLeaderTermsByGroup(g.id)).slice(0, 5),
    })),
  );

  const pastWithHeads = pastGroups.slice(0, 12);

  const leaderIdsInTerms = groupsWithTerms.flatMap((g) => g.terms.map((t) => t.leaderId));
  const leaderNames = await getUsersByIds([
    ...groups.map((g) => g.currentLeaderId ?? "").filter(Boolean),
    ...pastWithHeads.map((g) => g.currentLeaderId ?? "").filter(Boolean),
    ...leaderIdsInTerms,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">가장·임원 관리</h2>
        <p className="text-sm text-stone-600">
          가족은 1년에 상반기·하반기 두 번 구성하고, 가장도 그때 정합니다. 지금 학기는{" "}
          <span className="font-medium text-stone-800">{termLabel(term)}</span>
          입니다. 가족원·가족 보고 방은 그 학기 가족에 묶입니다.
        </p>
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="font-medium text-stone-900">다음 학기 시작</h3>
        <p className="mt-1 text-sm text-stone-600">
          {termLabel(upcoming)} 구성을 엽니다. 이전 학기 가족은 남겨 두고, 새 가족과 가장을 다시 짭니다.
          이전 학기 가족원은 「가족」에서 미배정으로 보이니 새 가족으로 옮기면 됩니다.
        </p>
        <form
          action={async () => {
            "use server";
            await startNextFamilyTerm();
          }}
          className="mt-3"
        >
          <Button type="submit" variant="secondary">
            {termLabel(upcoming)} 구성 시작
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="임원 직책" subtitle="리더 계정에 회장~부회계 직책을 지정합니다" />
        <ul className="divide-y divide-stone-100">
          {leaders.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <div>
                <p className="font-medium text-stone-900">{l.name}</p>
                <p className="text-xs text-stone-500">{l.email}</p>
              </div>
              <form
                action={async (fd) => {
                  "use server";
                  await updateOfficerTitle(
                    l.id,
                    (fd.get("officerTitle") as string) as never,
                  );
                }}
                className="flex items-center gap-2"
              >
                <select
                  name="officerTitle"
                  defaultValue={l.officerTitle ?? ""}
                  className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                >
                  <option value="">임원 아님</option>
                  {OFFICER_TITLES.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
                <Button type="submit" variant="secondary">저장</Button>
              </form>
            </li>
          ))}
          {leaders.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">등록된 리더 계정이 없습니다.</li>
          )}
        </ul>
      </Card>

      <div>
        <h3 className="mb-3 text-base font-semibold">{termLabel(term)} 가장 구성</h3>
        <div className="grid gap-6 lg:grid-cols-2">
        {groupsWithTerms.map(({ group: g, terms }) => (
          <Card key={g.id}>
            <CardHeader
              title={g.name}
              subtitle={`현재 가장: ${(g.currentLeaderId && leaderNames.get(g.currentLeaderId)?.name) ?? "미배정"}`}
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
                  <Label>이 학기 가장</Label>
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
                <Button type="submit">가장 임명</Button>
              </form>
              <div>
                <p className="text-xs font-medium uppercase text-stone-500">이력</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-700">
                  {terms.map((t) => (
                    <li key={t.id}>
                      {leaderNames.get(t.leaderId)?.name ?? "알 수 없음"} · {termLabel({ year: t.year, half: t.half })} · {formatDateKo(t.startedAt)}
                      {t.endedAt ? ` ~ ${formatDateKo(t.endedAt)}` : " ~ 현재"}
                    </li>
                  ))}
                  {terms.length === 0 && <li className="text-stone-400">이력 없음</li>}
                </ul>
              </div>
            </div>
          </Card>
        ))}
        {groupsWithTerms.length === 0 && (
          <p className="text-sm text-stone-500">이번 학기 가족이 없습니다. 「가족」에서 먼저 만들어 주세요.</p>
        )}
        </div>
      </div>

      {pastWithHeads.length > 0 && (
        <Card>
          <CardHeader title="지난 학기 가족" subtitle="열람만 가능합니다" />
          <ul className="divide-y divide-stone-100 text-sm">
            {pastWithHeads.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="block px-4 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
                >
                  {g.name} · {termLabel({ year: g.year, half: g.half })} · 가장{" "}
                  {(g.currentLeaderId && leaderNames.get(g.currentLeaderId)?.name) ?? "미배정"}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
