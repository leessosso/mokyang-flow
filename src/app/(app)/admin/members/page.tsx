import Link from "next/link";
import { redirect } from "next/navigation";
import { createMember, importGroupMembers } from "@/app/actions";
import { MemberBulkImport } from "@/components/member-bulk-import";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { termLabel } from "@/lib/format";
import { listAllMembers, listGroups } from "@/lib/store/groups";
import { getCurrentTerm } from "@/lib/store/settings";
import { getUsersByIds } from "@/lib/store/users";

export default async function MemberRosterPage() {
  if (!(await currentUserCanManageApp())) redirect("/dashboard");

  const [term, groups, members] = await Promise.all([
    getCurrentTerm(),
    listGroups(),
    listAllMembers(),
  ]);
  const leaders = await getUsersByIds(groups.map((group) => group.currentLeaderId ?? ""));
  const families = groups.map((group) => {
    const leaderName = group.currentLeaderId ? leaders.get(group.currentLeaderId)?.name : undefined;
    const count = members.filter((member) => member.groupId === group.id).length;
    return {
      id: group.id,
      name: group.name,
      leaderName: leaderName ?? "미배정",
      count,
      label: `${group.name} · 가장 ${leaderName ?? "미배정"} · ${count}명`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">성도 명단</h2>
        <p className="text-sm text-stone-600">
          {termLabel(term)} 가족에 가족원을 넣습니다. 임원·목사가 이 화면에서 명단을 관리합니다.
        </p>
      </div>

      {families.length === 0 ? (
        <Card className="p-4 sm:p-5">
          <p className="text-sm text-stone-700">
            이번 학기 가족이 없습니다.{" "}
            <Link href="/groups" className="font-medium text-stone-900 underline">
              가족
            </Link>
            에서 가족을 만든 뒤 명단을 넣습니다.
          </p>
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-medium text-stone-900">한꺼번에 넣기</h3>
            <p className="mt-1 text-sm text-stone-600">
              한 줄에 한 명씩 붙여 넣거나, CSV·엑셀 파일을 올립니다. 연락처는 이름 옆 둘째 칸입니다. 그 가족에 이미 있는 이름은 건너뜁니다.
            </p>
            <div className="mt-3">
              <MemberBulkImport
                families={families.map((family) => ({ id: family.id, label: family.label }))}
                action={importGroupMembers}
              />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-medium text-stone-900">한 명 추가</h3>
            <form
              action={async (formData) => {
                "use server";
                await createMember(
                  String(formData.get("groupId") ?? ""),
                  String(formData.get("name") ?? ""),
                  String(formData.get("phone") ?? "") || undefined,
                );
              }}
              className="mt-3 space-y-3"
            >
              <div>
                <Label>가족</Label>
                <select
                  name="groupId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                >
                  <option value="" disabled>
                    가족 선택
                  </option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>이름</Label>
                <Input name="name" required placeholder="이름" />
              </div>
              <div>
                <Label>연락처</Label>
                <Input name="phone" placeholder="연락처" />
              </div>
              <Button type="submit">추가</Button>
            </form>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="이번 학기 가족" subtitle="숫자를 누르면 그 가족 가족원을 봅니다" />
        <ul className="divide-y divide-stone-100 text-sm">
          {families.map((family) => (
            <li key={family.id}>
              <Link href={`/groups/${family.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 sm:px-5">
                <span>
                  <span className="font-medium text-stone-900">{family.name}</span>
                  <span className="text-stone-500"> · 가장 {family.leaderName}</span>
                </span>
                <span className="shrink-0 text-stone-600">{family.count}명</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
