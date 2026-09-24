import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  createSharingPlan,
  setMeetingServingDuty,
  updateMeetingNotes,
  uploadMeetingAsset,
} from "@/app/actions";
import { SharingEditor } from "@/components/sharing-editor";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { formatDateKo, formatDateTimeKo } from "@/lib/format";
import { listAllMembers } from "@/lib/store/groups";
import { getMeetingById, listAssetsByMeeting } from "@/lib/store/meetings";
import {
  listAssignmentsBySharingGroup,
  listSharingGroupsByPlan,
  getPlanByMeeting,
} from "@/lib/store/sharing";
import { listLoginUsersForServing } from "@/lib/store/users";
import {
  SORTING_HAT_ADMIN_PATH,
  SORTING_HAT_USER_PATH,
  canManageSortingHat,
} from "@/lib/sorting-hat";
import { SERVING_DUTIES, meetingDutyUserId, type MeetingAssetKind } from "@/lib/types";

const ASSET_LABEL: Record<MeetingAssetKind, string> = {
  LESSON: "교안",
  LESSON_COMMENTARY: "교안 해설지",
  SCORE: "악보",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;
  const canAdmin = isPastorOrAdmin(user.role);
  const canEdit = canAdmin || user.role === "LEADER";

  const meeting = await getMeetingById(id);
  if (!meeting) notFound();

  const [assets, loginUsers, plan] = await Promise.all([
    listAssetsByMeeting(id),
    listLoginUsersForServing(),
    getPlanByMeeting(id),
  ]);

  const lessonAssets = assets.filter((a) => a.kind === "LESSON" || a.kind === "LESSON_COMMENTARY");
  const scoreAssets = assets.filter((a) => a.kind === "SCORE");

  const prayerLeaderId = meetingDutyUserId(meeting, "prayer_meeting_lead");
  const prayerLeaderName = prayerLeaderId
    ? loginUsers.find((l) => l.id === prayerLeaderId)?.name
    : undefined;
  const isPrayerLeader = prayerLeaderId === user.id;

  let sharingGroups: { id: string; name: string; assignments: { member: { id: string; name: string } }[] }[] = [];
  if (plan) {
    const sgs = await listSharingGroupsByPlan(plan.id);
    const allMembers = await listAllMembers();
    sharingGroups = await Promise.all(
      sgs.map(async (sg) => {
        const assignments = await listAssignmentsBySharingGroup(sg.id);
        return {
          id: sg.id,
          name: sg.name,
          assignments: assignments
            .map((a) => allMembers.find((m) => m.id === a.memberId))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .map((m) => ({ member: { id: m.id, name: m.name } })),
        };
      }),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/meetings" className="text-sm text-stone-600 underline">← 모임 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{meeting.title}</h2>
        <p className="text-sm text-stone-600">{formatDateTimeKo(meeting.date)}</p>
        <p className="mt-1 text-xs text-stone-500">참석: 가장들 + 임원 + 목사</p>
      </div>

      <Card>
        <CardHeader title="기본 자료" subtitle="교안·교안 해설지 (가장·임원 열람용)" />
        <div className="space-y-3 p-4 sm:p-5">
          <ul className="space-y-2">
            {lessonAssets.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                    {ASSET_LABEL[a.kind]}
                  </span>
                  {a.fileName}
                </span>
                <a
                  href={`/api/meetings/${id}/assets/${a.id}`}
                  className="text-sm font-medium text-stone-800 underline"
                >
                  다운로드
                </a>
              </li>
            ))}
            {lessonAssets.length === 0 && (
              <li className="text-sm text-stone-500">아직 없음</li>
            )}
          </ul>
          {canAdmin && (
            <div className="grid gap-3 border-t border-stone-100 pt-3 sm:grid-cols-2">
              <form
                action={async (fd) => {
                  "use server";
                  await uploadMeetingAsset(id, "LESSON", fd);
                }}
                className="space-y-2"
              >
                <Label>교안 업로드</Label>
                <input type="file" name="file" required className="text-sm" />
                <Button type="submit" variant="secondary">올리기</Button>
              </form>
              <form
                action={async (fd) => {
                  "use server";
                  await uploadMeetingAsset(id, "LESSON_COMMENTARY", fd);
                }}
                className="space-y-2"
              >
                <Label>교안 해설지 업로드</Label>
                <input type="file" name="file" required className="text-sm" />
                <Button type="submit" variant="secondary">올리기</Button>
              </form>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="섬김 담당 (이번 모임)"
          subtitle="담당을 저장하면 해당 사용자 기기로 「본인 담당」 푸시가 갑니다 (알림을 켠 경우)"
        />
        <ul className="divide-y divide-stone-100">
          {SERVING_DUTIES.map((duty) => {
            const currentUserId = meetingDutyUserId(meeting, duty.key);
            const assigneeName = currentUserId
              ? loginUsers.find((u) => u.id === currentUserId)?.name
              : undefined;
            return (
              <li key={duty.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-sm font-medium text-stone-900">{duty.label}</p>
                  <p className="text-xs text-stone-500">
                    담당: {assigneeName ?? "미지정"}
                  </p>
                </div>
                {canAdmin && (
                  <form
                    action={async (fd) => {
                      "use server";
                      await setMeetingServingDuty(
                        id,
                        duty.key,
                        (fd.get("userId") as string) ?? "",
                      );
                    }}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <select
                      name="userId"
                      defaultValue={currentUserId ?? ""}
                      className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">미지정</option>
                      {loginUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                          {(u.servingDutyKeys ?? []).includes(duty.key) ? " ★" : ""}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary">저장</Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {!canAdmin && (
          <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500 sm:px-5">
            담당 변경은 목사·관리자만 할 수 있습니다.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title="리더 모임 전 기도회" subtitle="지정된 인도자만 악보를 올릴 수 있습니다" />
        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-sm text-stone-700">
            기도회 인도자: <span className="font-medium">{prayerLeaderName ?? "미지정"}</span>
            <span className="ml-2 text-xs text-stone-500">(위 「섬김 담당」에서 지정)</span>
          </p>
          <ul className="space-y-2">
            {scoreAssets.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <span>{a.fileName}</span>
                <a
                  href={`/api/meetings/${id}/assets/${a.id}`}
                  className="text-sm font-medium text-stone-800 underline"
                >
                  다운로드
                </a>
              </li>
            ))}
            {scoreAssets.length === 0 && (
              <li className="text-sm text-stone-500">아직 악보 없음</li>
            )}
          </ul>
          {(isPrayerLeader || canAdmin) && prayerLeaderId && (
            <form
              action={async (fd) => {
                "use server";
                await uploadMeetingAsset(id, "SCORE", fd);
              }}
              className="space-y-2 border-t border-stone-100 pt-3"
            >
              <Label>악보 업로드</Label>
              <input type="file" name="file" required className="text-sm" />
              <Button type="submit" variant="secondary">올리기</Button>
            </form>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="현장 배정" subtitle="배정 모자로 오늘 출석 임원 수만큼 조를 만들고 가장을 배정합니다" />
        <div className="flex flex-wrap gap-3 px-4 py-4 sm:px-5">
          <Link href={SORTING_HAT_USER_PATH} className="text-sm font-medium text-stone-800 underline">
            배정 모자 열기
          </Link>
          {canManageSortingHat(user.role) && (
            <Link href={SORTING_HAT_ADMIN_PATH} className="text-sm font-medium text-stone-800 underline">
              배정 관리
            </Link>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="모임 메모" />
        {canAdmin ? (
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
          subtitle="본조 고정 또는 임시 섞기 (주일 나눔용, 선택 사항)"
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
              className="grid gap-3 sm:max-w-md"
            >
              <div>
                <Label>나눔 날짜</Label>
                <Input name="serviceDate" type="date" required />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="useHomeGroups" />
                본가족(홈 그룹) 그대로 사용
              </label>
              <Button type="submit">조편성 만들기</Button>
            </form>
          )}
          {plan && (
            <>
              <p className="mb-4 text-sm text-stone-600">
                나눔일: {formatDateKo(plan.serviceDate)} ·{" "}
                {plan.useHomeGroups ? "본가족 고정" : "임시 섞기"}
              </p>
              <SharingEditor
                meetingId={id}
                planId={plan.id}
                useHomeGroups={plan.useHomeGroups}
                groups={sharingGroups}
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
