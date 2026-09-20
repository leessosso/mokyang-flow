import Link from "next/link";
import { auth } from "@/auth";
import { createEventSurvey } from "@/app/actions";
import { Badge, Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { listEventSurveys } from "@/lib/store/surveys";

const QUESTION_ROWS = [1, 2, 3, 4, 5, 6];

export default async function SurveysPage() {
  const session = await auth();
  const canAdmin = isPastorOrAdmin(session!.user.role);

  const surveys = await listEventSurveys();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">참여조사</h2>
        <p className="text-sm text-stone-600">식수·행사처럼 그때그때 만드는 참여 인원 조사</p>
      </div>

      <div
        className={
          canAdmin
            ? "grid items-start gap-6 lg:grid-cols-[minmax(22rem,26rem)_1fr]"
            : undefined
        }
      >
        {canAdmin && (
          <Card className="p-4 sm:p-5 lg:sticky lg:top-8">
            <h3 className="font-medium">새 조사 만들기</h3>
            <form
              action={async (fd) => {
                "use server";
                await createEventSurvey(fd);
              }}
              className="mt-3 grid gap-3"
            >
              <div>
                <Label>제목</Label>
                <Input name="title" required placeholder="추석 주일 식수조사" />
              </div>
              <div>
                <Label>날짜</Label>
                <Input name="eventDate" type="date" required />
              </div>
              <div>
                <Label>설명</Label>
                <Textarea name="description" placeholder="가족원마다 참여 여부·식수를 입력해 주세요" />
              </div>
              <div className="space-y-2">
                <Label>질문 (최대 6개, 빈 칸은 무시)</Label>
                {QUESTION_ROWS.map((i) => (
                  <div key={i} className="flex gap-2">
                    <Input name={`q${i}_label`} placeholder={`질문 ${i} (예: 식수 인원)`} />
                    <select
                      name={`q${i}_type`}
                      defaultValue="yesno"
                      className="rounded-lg border border-stone-300 px-2 py-2 text-sm"
                    >
                      <option value="yesno">예/아니오</option>
                      <option value="number">인원(숫자)</option>
                      <option value="text">메모</option>
                    </select>
                  </div>
                ))}
              </div>
              <Button type="submit">만들기</Button>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader title="조사 목록" />
          <ul className="divide-y divide-stone-100">
            {surveys.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-stone-500">{formatDateKo(s.eventDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.status === "open" ? "green" : "neutral"}>
                    {s.status === "open" ? "진행 중" : "마감"}
                  </Badge>
                  <Link href={`/surveys/${s.id}`} className="text-sm font-medium underline">
                    보기
                  </Link>
                </div>
              </li>
            ))}
            {surveys.length === 0 && (
              <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">등록된 조사가 없습니다.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
