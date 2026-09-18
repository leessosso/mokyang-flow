import Link from "next/link";
import { auth } from "@/auth";
import { createLeaderMeeting } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTimeKo } from "@/lib/format";

export default async function MeetingsPage() {
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const meetings = await prisma.leaderMeeting.findMany({
    orderBy: { date: "desc" },
    include: { sharingPlan: true },
  });

  const now = new Date();
  const upcoming = meetings.filter((m) => m.date >= now);
  const past = meetings.filter((m) => m.date < now);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">조장 모임</h2>
        <p className="text-sm text-stone-600">모임 일정, 메모, 나눔 조편성을 관리합니다.</p>
      </div>

      {canAdmin && (
        <Card className="p-4 sm:p-5">
          <h3 className="font-medium">새 모임 등록</h3>
          <form
            action={async (fd) => {
              "use server";
              const res = await createLeaderMeeting({
                title: fd.get("title") as string,
                date: fd.get("date") as string,
                notes: (fd.get("notes") as string) || undefined,
              });
              if (res.id) {
                // redirect handled by revalidate
              }
            }}
            className="mt-3 grid gap-3"
          >
            <div>
              <Label>제목</Label>
              <Input name="title" required placeholder="4월 1주 조장 모임" />
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

      <Section title="예정된 모임" items={upcoming} />
      <Section title="지난 모임" items={past} />
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: {
    id: string;
    title: string;
    date: Date;
    sharingPlan: { id: string } | null;
  }[];
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
                {m.sharingPlan ? "조편성·상세" : "상세·조편성 만들기"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
