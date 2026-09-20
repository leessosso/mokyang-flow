import Link from "next/link";
import { auth } from "@/auth";
import { createLeaderMeeting } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { formatDateTimeKo } from "@/lib/format";
import { listMeetings } from "@/lib/store/meetings";
import { getPlanByMeeting } from "@/lib/store/sharing";
import type { LeaderMeeting } from "@/lib/types";

export default async function MeetingsPage() {
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const meetings = await listMeetings();
  const plans = await Promise.all(meetings.map((m) => getPlanByMeeting(m.id)));
  const hasPlan = new Map(meetings.map((m, i) => [m.id, !!plans[i]]));

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.date) >= now);
  const past = meetings.filter((m) => new Date(m.date) < now);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">리더 모임</h2>
        <p className="text-sm text-stone-600">
          가장·임원·목사가 매주 모이는 자리입니다. 교안·해설지, 기도회 악보, 배정 모자를 여기서 준비합니다.
        </p>
      </div>

      <div
        className={
          canAdmin
            ? "grid items-start gap-6 lg:grid-cols-[minmax(20rem,24rem)_1fr]"
            : "space-y-6"
        }
      >
        {canAdmin && (
          <Card className="p-4 sm:p-5 lg:sticky lg:top-8">
            <h3 className="font-medium">새 모임 등록</h3>
            <form
              action={async (fd) => {
                "use server";
                await createLeaderMeeting({
                  title: fd.get("title") as string,
                  date: fd.get("date") as string,
                  notes: (fd.get("notes") as string) || undefined,
                });
              }}
              className="mt-3 grid gap-3"
            >
              <div>
                <Label>제목</Label>
                <Input name="title" required placeholder="4월 1주 리더 모임" />
              </div>
              <div>
                <Label>일시</Label>
                <Input name="date" type="datetime-local" required />
              </div>
              <div>
                <Label>메모</Label>
                <Textarea name="notes" placeholder="안건, 기도 제목 등" />
              </div>
              <Button type="submit">등록</Button>
            </form>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="예정된 모임" items={upcoming} hasPlan={hasPlan} />
          <Section title="지난 모임" items={past} hasPlan={hasPlan} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  hasPlan,
}: {
  title: string;
  items: LeaderMeeting[];
  hasPlan: Map<string, boolean>;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500 sm:px-5">없음</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-stone-500">{formatDateTimeKo(m.date)}</p>
              </div>
              <Link href={`/meetings/${m.id}`} className="text-sm font-medium text-stone-800 underline">
                {hasPlan.get(m.id) ? "자료·조편성 보기" : "상세 보기"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
