import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { saveAttendanceMarks } from "@/app/actions";
import { Button, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp, leaderCanAccessGroup } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import {
  getAttendanceSundayById,
  listMarksBySundayAndGroup,
  markMapByMemberId,
  summarizeMarks,
} from "@/lib/store/attendance";
import { getGroupById, listMembersByGroup } from "@/lib/store/groups";
import type { AttendanceStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "참석" },
  { value: "broadcast", label: "방송" },
  { value: "none", label: "결석" },
];

export default async function AttendanceGroupPage({
  params,
}: {
  params: Promise<{ sundayId: string; groupId: string }>;
}) {
  const { sundayId, groupId } = await params;
  const session = await auth();
  const user = session!.user;
  const canEditQr = await currentUserCanManageApp();

  if (!canEditQr) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) notFound();
  }

  const [sunday, group, members, existingMarks] = await Promise.all([
    getAttendanceSundayById(sundayId),
    getGroupById(groupId),
    listMembersByGroup(groupId),
    listMarksBySundayAndGroup(sundayId, groupId),
  ]);
  if (!sunday || !group) notFound();

  const marks = markMapByMemberId(existingMarks);
  const totals = summarizeMarks(members.map((m) => m.id), marks);

  return (
    <div className="space-y-6">
      <div>
        <Link href={canEditQr ? `/attendance/${sundayId}` : "/attendance"} className="text-sm text-stone-600 underline">
          ← {canEditQr ? "가족별 합계" : "주일 목록"}
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{group.name} · {sunday.title}</h2>
        <p className="text-sm text-stone-600">{formatDateKo(sunday.date)}</p>
        <p className="mt-1 text-sm text-stone-500">
          1-3부 참석 {totals.s13.present} · 방송 {totals.s13.broadcast} · QR {totals.s13.qr}
          {" · "}4부 참석 {totals.s4.present} · 방송 {totals.s4.broadcast} · QR {totals.s4.qr}
          {" · "}가족모임 {totals.familyMeeting}
        </p>
      </div>

      <Card>
        <CardHeader title="가족원 출석" subtitle={canEditQr ? undefined : "QR은 교회 명단 업로드로만 켜집니다"} />
        <form
          action={async (fd) => {
            "use server";
            await saveAttendanceMarks(sundayId, groupId, fd);
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-stone-500">
                  <th className="px-4 py-2 sm:px-5">이름</th>
                  <th className="px-2 py-2">1-3부</th>
                  <th className="px-2 py-2">1-3부 QR</th>
                  <th className="px-2 py-2">4부</th>
                  <th className="px-2 py-2">4부 QR</th>
                  <th className="px-2 py-2">가족모임</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {members.map((m) => {
                  const mark = marks.get(m.id);
                  const s13Status = mark?.s13.status ?? "none";
                  const s4Status = mark?.s4.status ?? "none";
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium sm:px-5">
                        {m.name}
                        <input type="hidden" name="memberId" value={m.id} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-3">
                          {STATUS_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-1 text-xs">
                              <input
                                type="radio"
                                name={`s13_${m.id}`}
                                value={opt.value}
                                defaultChecked={s13Status === opt.value}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          name={`qr13_${m.id}`}
                          defaultChecked={mark?.s13.qr ?? false}
                          disabled={!canEditQr}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex gap-3">
                          {STATUS_OPTIONS.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-1 text-xs">
                              <input
                                type="radio"
                                name={`s4_${m.id}`}
                                value={opt.value}
                                defaultChecked={s4Status === opt.value}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          name={`qr4_${m.id}`}
                          defaultChecked={mark?.s4.qr ?? false}
                          disabled={!canEditQr}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          name={`family_${m.id}`}
                          defaultChecked={mark?.familyMeeting ?? false}
                        />
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                      가족원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {members.length > 0 && (
            <div className="border-t border-stone-100 p-4 sm:p-5">
              <Button type="submit">저장</Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
