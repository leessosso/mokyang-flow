import Link from "next/link";
import { createGroup, createLeaderAction } from "@/app/actions";
import { AddLeaderForm } from "@/components/add-leader-form";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { termLabel } from "@/lib/format";
import { listAllMembers, listGroups, listUnassignedMembers } from "@/lib/store/groups";
import { listActiveOfficers } from "@/lib/store/officers";
import { getCurrentTerm } from "@/lib/store/settings";
import { getUsersByIds, listUsersByRole } from "@/lib/store/users";

export default async function GroupsPage() {
  const canAdmin = await currentUserCanManageApp();

  const term = await getCurrentTerm();
  const [groups, unassigned, members, leaderUsers, officers] = await Promise.all([
    listGroups(),
    canAdmin ? listUnassignedMembers() : Promise.resolve([]),
    listAllMembers(),
    canAdmin ? listUsersByRole("LEADER") : Promise.resolve([]),
    canAdmin ? listActiveOfficers(term.year) : Promise.resolve([]),
  ]);
  const leaders = await getUsersByIds(groups.map((g) => g.currentLeaderId ?? "").filter(Boolean));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">가족</h2>
        <p className="text-sm text-stone-600">
          {termLabel(term)} 구성입니다. 가족과 가장은 이 학기에 다시 정합니다.
        </p>
      </div>

      {canAdmin && officers.length === 0 && (
        <Card className="p-4 sm:p-5">
          <p className="text-sm text-stone-700">
            올해 임원이 아직 없습니다.{" "}
            <Link href="/admin/handover" className="font-medium text-stone-900 underline">
              가장·임원 관리
            </Link>
            에서 목사가 임원을 앉힌 뒤 가족을 구성합니다.
          </p>
        </Card>
      )}

      {canAdmin && (
        <Card className="p-4 sm:p-5">
          <AddLeaderForm action={createLeaderAction} />
        </Card>
      )}

      {canAdmin && (
        <Card className="p-4 sm:p-5">
          <h3 className="font-medium text-stone-900">이 학기 가족 추가</h3>
          <form
            action={async (fd) => {
              "use server";
              await createGroup(fd.get("name") as string, fd.get("leaderId") as string);
            }}
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            <div>
              <Label>가족 이름</Label>
              <Input name="name" required placeholder="4가족" />
            </div>
            <div>
              <Label>가장</Label>
              <select
                name="leaderId"
                required
                defaultValue=""
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
              >
                <option value="" disabled>
                  가장 선택
                </option>
                {leaderUsers.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                    {leader.officerTitle ? ` · ${leader.officerTitle}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">추가</Button>
            </div>
          </form>
        </Card>
      )}

      {canAdmin && unassigned.length > 0 && (
        <Card>
          <CardHeader
            title="이번 학기 미배정 가족원"
            subtitle="이전 학기 가족에 남아 있습니다. 새 가족으로 옮겨 주세요."
          />
          <ul className="divide-y divide-stone-100 text-sm">
            {unassigned.map((m) => (
              <li key={m.id} className="px-4 py-2 sm:px-5">{m.name}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <Card className="h-full transition hover:border-stone-300 hover:bg-stone-50">
              <CardHeader title={g.name} />
              <div className="space-y-2 px-4 py-3 text-sm sm:px-5">
                <p>
                  <span className="text-stone-500">가장:</span>{" "}
                  {(g.currentLeaderId && leaders.get(g.currentLeaderId)?.name) ?? "미배정"}
                </p>
                <p>
                  <span className="text-stone-500">가족원:</span>{" "}
                  {members.filter((m) => m.groupId === g.id).length}명
                </p>
              </div>
            </Card>
          </Link>
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-stone-500">이번 학기에 구성된 가족이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
