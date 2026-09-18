import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { createSharingPlan, updateMeetingNotes } from "@/app/actions";
import { SharingEditor } from "@/components/sharing-editor";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateKo, formatDateTimeKo } from "@/lib/format";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canEdit = isPastorOrAdmin(session!.user.role) || session!.user.role === "LEADER";

  const meeting = await prisma.leaderMeeting.findUnique({
    where: { id },
    include: {
      sharingPlan: {
        include: {
          tempGroups: {
            include: {
              assignments: { include: { member: true } },
            },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });
  if (!meeting) notFound();

  const plan = meeting.sharingPlan;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/meetings" className="text-sm text-stone-600 underline">← 모임 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{meeting.title}</h2>
        <p className="text-sm text-stone-600">{formatDateTimeKo(meeting.date)}</p>
      </div>

      <Card>
        <CardHeader title="모임 메모" />
        {isPastorOrAdmin(session!.user.role) ? (
          <form
            action={async (fd) => {
              "use server";
              await updateMeetingNotes(id, fd.get("notes") as string);
            }}
            className="p-4 sm:p-5"
          >
            <Textarea name="notes" defaultValue={meeting.notes ?? ""} />
            <Button type="submit" className="mt-2">저장</Button>
          </form>
        ) : (
          <p className="whitespace-pre-wrap px-4 py-3 text-sm text-stone-700 sm:px-5">
            {meeting.notes || "메모 없음"}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title="주간 나눔 조편성"
          subtitle="본조 고정 또는 임시 섞기"
        />
        <div className="p-4 sm:p-5">
          {!plan && canEdit && (
            <form
              action={async (fd) => {
                "use server";
                await createSharingPlan(
                  id,
                  fd.get("serviceDate") as string,
                  fd.get("useHomeGroups") === "on",
                );
              }}
              className="grid max-w-md gap-3"
            >
              <div>
                <Label>나눔 날짜</Label>
                <Input name="serviceDate" type="date" required />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="useHomeGroups" />
                본조(홈 그룹) 그대로 사용
              </label>
              <Button type="submit">조편성 만들기</Button>
            </form>
          )}
          {plan && (
            <>
              <p className="mb-4 text-sm text-stone-600">
                나눔일: {formatDateKo(plan.serviceDate)} ·{" "}
                {plan.useHomeGroups ? "본조 고정" : "임시 섞기"}
              </p>
              <SharingEditor
                planId={plan.id}
                useHomeGroups={plan.useHomeGroups}
                groups={plan.tempGroups.map((g) => ({
                  id: g.id,
                  name: g.name,
                  assignments: g.assignments.map((a) => ({
                    member: { id: a.member.id, name: a.member.name },
                  })),
                }))}
              />
            </>
          )}
          {!plan && !canEdit && (
            <p className="text-sm text-stone-500">조편성이 아직 없습니다.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
