import Link from "next/link";
import { auth } from "@/auth";
import { createAttendanceSunday } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { listAttendanceSundays, listMarksBySunday, summarizeAllMarks } from "@/lib/store/attendance";

export default async function AttendanceListPage() {
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const sundays = await listAttendanceSundays();

  const totalsBySunday = await Promise.all(
    sundays.map(async (s) => summarizeAllMarks(await listMarksBySunday(s.id))),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">출석</h2>
        <p className="text-sm text-stone-600">주일 1-3부·4부 참석·방송·QR 현황</p>
      </div>

      <div
        className={
          canAdmin
            ? "grid items-start gap-6 lg:grid-cols-[minmax(20rem,24rem)_1fr]"
            : undefined
        }
      >
        {canAdmin && (
          <Card className="p-4 sm:p-5 lg:sticky lg:top-8">
            <h3 className="font-medium">새 주일 열기</h3>
            <form
              action={async (fd) => {
                "use server";
                await createAttendanceSunday(
                  fd.get("date") as string,
                  fd.get("title") as string,
                );
              }}
              className="mt-3 grid gap-3"
            >
              <div>
                <Label>날짜</Label>
                <Input name="date" type="date" required />
              </div>
              <div>
                <Label>제목</Label>
                <Input name="title" placeholder="9월 20일 주일" />
              </div>
              <Button type="submit">열기</Button>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader title="주일 목록" />
          <ul className="divide-y divide-stone-100">
            {sundays.map((s, i) => {
              const totals = totalsBySunday[i];
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-stone-500">{formatDateKo(s.date)}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      1-3부 참석 {totals.s13.present} · 방송 {totals.s13.broadcast} · QR {totals.s13.qr} ·
                      {" "}4부 참석 {totals.s4.present} · 방송 {totals.s4.broadcast} · QR {totals.s4.qr} ·
                      {" "}가족모임 {totals.familyMeeting}
                    </p>
                  </div>
                  <Link href={`/attendance/${s.id}`} className="text-sm font-medium underline">
                    보기
                  </Link>
                </li>
              );
            })}
            {sundays.length === 0 && (
              <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">등록된 주일이 없습니다.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
