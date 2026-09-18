import Link from "next/link";
import { auth } from "@/auth";
import { createWorshipService } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateKo } from "@/lib/format";

export default async function WorshipListPage() {
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const services = await prisma.worshipService.findMany({
    orderBy: { date: "desc" },
    include: { assignments: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">예배 좌석 배치</h2>
        <p className="text-sm text-stone-600">조별 구역 배치 및 인도용 화면</p>
      </div>

      {canAdmin && (
        <Card className="p-4 sm:p-5">
          <h3 className="font-medium">새 예배 일정</h3>
          <form
            action={async (fd) => {
              "use server";
              await createWorshipService(
                fd.get("date") as string,
                (fd.get("title") as string) || "주일예배",
              );
            }}
            className="mt-3 flex flex-wrap gap-3"
          >
            <div>
              <Label>날짜</Label>
              <Input name="date" type="date" required />
            </div>
            <div>
              <Label>제목</Label>
              <Input name="title" placeholder="주일 2부 예배" />
            </div>
            <Button type="submit" className="self-end">생성</Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="예배 목록" />
        <ul className="divide-y divide-stone-100">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-stone-500">{formatDateKo(s.date)}</p>
              </div>
              <Link href={`/worship/${s.id}`} className="text-sm font-medium underline">
                배치 ({s.assignments.length}조)
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
