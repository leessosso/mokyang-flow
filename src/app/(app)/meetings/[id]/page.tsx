import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  setPrayerLeader,
  updateMeetingNotes,
  uploadMeetingAsset,
} from "@/app/actions";
import { Button, Card, CardHeader, Label, Textarea } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTimeKo } from "@/lib/format";
import { listCurrentLeaderUserIds } from "@/lib/store/groups";
import { getMeetingById, listAssetsByMeeting } from "@/lib/store/meetings";
import { getUsersByIds, listLoginUsersForServing } from "@/lib/store/users";
import {
  SORTING_HAT_ADMIN_PATH,
  SORTING_HAT_USER_PATH,
  meetingReturnPath,
} from "@/lib/sorting-hat";
import { canManageApp, canManageAnnouncements, meetingDutyUserId, type MeetingAsset } from "@/lib/types";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;
  const currentUser = await getCurrentUser();
  const canAdmin = currentUser ? canManageApp(currentUser) : false;
  const canEditAnnouncement = currentUser ? canManageAnnouncements(currentUser) : false;

  const meeting = await getMeetingById(id);
  if (!meeting) notFound();

  const [assets, loginUsers, leaderIds] = await Promise.all([
    listAssetsByMeeting(id),
    listLoginUsersForServing(),
    listCurrentLeaderUserIds(),
  ]);
  const leadersById = await getUsersByIds(leaderIds);
  const familyLeaders = leaderIds
    .map((leaderId) => leadersById.get(leaderId))
    .filter((leader): leader is NonNullable<typeof leader> => !!leader)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const lessonAssets = assets.filter((a) => a.kind === "LESSON");
  const commentaryAssets = assets.filter((a) => a.kind === "LESSON_COMMENTARY");
  const scoreAssets = assets.filter((a) => a.kind === "SCORE");

  const prayerLeaderId = meetingDutyUserId(meeting, "prayer_meeting_lead");
  const prayerLeaderName = prayerLeaderId
    ? loginUsers.find((l) => l.id === prayerLeaderId)?.name
    : undefined;
  const isPrayerLeader = prayerLeaderId === user.id;
  const hatQuery = `?return=${encodeURIComponent(meetingReturnPath(id))}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/meetings" className="text-sm text-stone-600 underline">← 모임 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{meeting.title}</h2>
        <p className="text-sm text-stone-600">{formatDateTimeKo(meeting.date)}</p>
        <p className="mt-1 text-xs text-stone-500">
          참석: 가장 · 임원 · 게스트(부가장·사역팀장) · 목사
        </p>
      </div>

      <Card>
        <CardHeader
          title="1. 기도회"
          subtitle="그 주 선정된 가장이 인도합니다. 악보는 인도자만 올릴 수 있습니다."
        />
        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-sm text-stone-700">
            인도 가장: <span className="font-medium">{prayerLeaderName ?? "미지정"}</span>
          </p>
          {canAdmin && (
            <form
              action={async (fd) => {
                "use server";
                await setPrayerLeader(id, (fd.get("userId") as string) ?? "");
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <select
                name="userId"
                defaultValue={prayerLeaderId ?? ""}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                <option value="">미지정</option>
                {familyLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                    {(leader.servingDutyKeys ?? []).includes("prayer_meeting_lead") ? " ★" : ""}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">저장</Button>
            </form>
          )}
          <AssetList meetingId={id} assets={scoreAssets} emptyLabel="아직 악보 없음" />
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
        <CardHeader
          title="2. 말씀 교안 나눔"
          subtitle="배정 모자로 가장·임원·게스트(부가장·사역팀장) 조를 짠 뒤, 이번 주 교안으로 나눕니다."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <AssetList meetingId={id} assets={lessonAssets} emptyLabel="아직 교안 없음" />
          {canAdmin && (
            <form
              action={async (fd) => {
                "use server";
                await uploadMeetingAsset(id, "LESSON", fd);
              }}
              className="space-y-2 border-t border-stone-100 pt-3"
            >
              <Label>교안 업로드</Label>
              <input type="file" name="file" required className="text-sm" />
              <Button type="submit" variant="secondary">올리기</Button>
            </form>
          )}

          <div className="-mx-4 divide-y divide-stone-100 border-t border-stone-100 sm:-mx-5">
            <Link
              href={`${SORTING_HAT_USER_PATH}${hatQuery}`}
              className="block px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
            >
              배정 모자 열기
            </Link>
            {canAdmin && (
              <Link
                href={`${SORTING_HAT_ADMIN_PATH}${hatQuery}`}
                className="block px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
              >
                배정 관리
              </Link>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="3. 교안 해설" subtitle="목사님이 나눔 뒤에 교안을 해설합니다." />
        <div className="space-y-3 p-4 sm:p-5">
          <AssetList meetingId={id} assets={commentaryAssets} emptyLabel="아직 해설지 없음" />
          {canAdmin && (
            <form
              action={async (fd) => {
                "use server";
                await uploadMeetingAsset(id, "LESSON_COMMENTARY", fd);
              }}
              className="space-y-2 border-t border-stone-100 pt-3"
            >
              <Label>교안 해설지 업로드</Label>
              <input type="file" name="file" required className="text-sm" />
              <Button type="submit" variant="secondary">올리기</Button>
            </form>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="4. 그 주 광고" subtitle="2청년회 광고입니다. 목사·임원이 적습니다." />
        {canEditAnnouncement ? (
          <form
            action={async (fd) => {
              "use server";
              await updateMeetingNotes(id, fd.get("notes") as string);
            }}
            className="p-4 sm:p-5"
          >
            <Textarea name="notes" defaultValue={meeting.notes ?? ""} placeholder="이번 주 광고" />
            <Button type="submit" className="mt-2">저장</Button>
          </form>
        ) : (
          <p className="whitespace-pre-wrap px-4 py-3 text-sm text-stone-700 sm:px-5">
            {meeting.notes || "아직 광고 없음"}
          </p>
        )}
      </Card>
    </div>
  );
}

function AssetList({
  meetingId,
  assets,
  emptyLabel,
}: {
  meetingId: string;
  assets: MeetingAsset[];
  emptyLabel: string;
}) {
  if (assets.length === 0) {
    return <p className="text-sm text-stone-500">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {assets.map((asset) => (
        <li key={asset.id}>
          <a
            href={`/api/meetings/${meetingId}/assets/${asset.id}`}
            className="block rounded-lg border border-stone-200 px-3 py-2 text-sm transition hover:bg-stone-50"
          >
            {asset.fileName}
          </a>
        </li>
      ))}
    </ul>
  );
}
