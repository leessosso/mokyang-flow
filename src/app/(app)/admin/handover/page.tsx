import Link from "next/link";
import { redirect } from "next/navigation";
import { handoverLeader, startNextFamilyTerm } from "@/app/actions";
import { OfficerYearBoard } from "@/components/officer-year-board";
import { Button, Card, CardHeader, Label } from "@/components/ui";
import { currentUserCanManageApp, getCurrentUser } from "@/lib/auth";
import { formatDateKo, termLabel } from "@/lib/format";
import { listAllGroups, listGroups, listLeaderTermsByGroup } from "@/lib/store/groups";
import { listActiveOfficers } from "@/lib/store/officers";
import { getCurrentTerm } from "@/lib/store/settings";
import { listUsersByRole } from "@/lib/store/users";
import { getUsersByIds } from "@/lib/store/users";
import { nextTerm, sameTerm } from "@/lib/term";
import { isPastorOrAdmin, OFFICER_TITLES } from "@/lib/types";

export default async function HandoverPage() {
  if (!(await currentUserCanManageApp())) redirect("/dashboard");

  const [term, groups, allGroups, leaders, actor] = await Promise.all([
    getCurrentTerm(),
    listGroups(),
    listAllGroups(),
    listUsersByRole("LEADER"),
    getCurrentUser(),
  ]);
  const appointments = await listActiveOfficers(term.year);
  const isPastor = actor ? isPastorOrAdmin(actor.role) : false;
  const upcoming = nextTerm(term);
  const openingNewYear = upcoming.half === "H1";
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
    ...appointments.map((appointment) => appointment.userId),
  ]);
  const seats = OFFICER_TITLES.map((title) => {
    const appointment = appointments.find((item) => item.title === title);
    const person = appointment ? leaderNames.get(appointment.userId) : undefined;
    return {
      title,
      userId: appointment?.userId ?? null,
      name: person?.name ?? null,
      email: person?.email ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">가장·임원 관리</h2>
        <p className="text-sm text-stone-600">
          임원은 해마다 상반기에 정하고 하반기까지 둡니다. 가족과 가장은 상반기·하반기마다 다시 짭니다.
          지금 학기는 <span className="font-medium text-stone-800">{termLabel(term)}</span>
          입니다.
        </p>
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="font-medium text-stone-900">다음 학기 시작</h3>
        <p className="mt-1 text-sm text-stone-600">
          {openingNewYear
            ? `${termLabel(upcoming)}를 엽니다. 올해 임원 직책은 끝나고, 목사가 새 임원을 앉힙니다. 그 임원이 가족과 가장을 구성합니다. 이전 가족원은 「가족」에서 미배정으로 보입니다.`
            : `${termLabel(upcoming)}를 엽니다. 올해 임원은 그대로 두고, 가족과 가장만 다시 짭니다. 이전 가족원은 「가족」에서 미배정으로 보입니다.`}
        </p>
        {openingNewYear && !isPastor ? (
          <p className="mt-3 text-sm text-stone-500">다음 해 상반기는 목사가 엽니다.</p>
        ) : (
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
        )}
      </Card>

      <OfficerYearBoard
        year={term.year}
        half={term.half}
        seats={seats}
        leaders={leaders.map((leader) => ({ id: leader.id, name: leader.name, email: leader.email }))}
        isPastor={isPastor}
      />

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
