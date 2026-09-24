import Link from "next/link";
import { auth } from "@/auth";
import { Badge, Card, CardHeader } from "@/components/ui";
import { isPastorOrAdmin } from "@/lib/auth";
import { formatDateTimeKo, roleLabel } from "@/lib/format";
import { getGroupByCurrentLeader, listGroups, listMembersByGroup } from "@/lib/store/groups";
import { listMeetings } from "@/lib/store/meetings";
import { getPlanByMeeting } from "@/lib/store/sharing";
import { countThreadsWithMessages } from "@/lib/store/reports";
import { getLatestAttendanceSunday, listMarksBySunday } from "@/lib/store/attendance";
import {
  SORTING_HAT_ADMIN_PATH,
  SORTING_HAT_USER_PATH,
  canManageSortingHat,
} from "@/lib/sorting-hat";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { isWebPushConfigured } from "@/lib/firebase-client";
import { listPushSubscriptionsForUser } from "@/lib/store/push-subscriptions";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  const meetings = (await listMeetings()).slice(0, 3);
  const meetingPlans = await Promise.all(meetings.map((m) => getPlanByMeeting(m.id)));

  let myGroup = null;
  let myMemberCount = 0;
  if (user.role === "LEADER") {
    myGroup = await getGroupByCurrentLeader(user.id);
    if (myGroup) myMemberCount = (await listMembersByGroup(myGroup.id)).length;
  }

  const attendanceGroups = isPastorOrAdmin(user.role)
    ? await listGroups()
    : myGroup
      ? [myGroup]
      : [];

  const reportCount = isPastorOrAdmin(user.role)
    ? await countThreadsWithMessages(attendanceGroups.map((g) => g.id))
    : myGroup
      ? await countThreadsWithMessages([myGroup.id])
      : 0;

  const latestSunday = await getLatestAttendanceSunday();
  let missingAttendanceCount = 0;
  if (latestSunday) {
    const marks = await listMarksBySunday(latestSunday.id);
    const groupIdsWithMarks = new Set(marks.map((m) => m.groupId));
    missingAttendanceCount = attendanceGroups.filter((g) => !groupIdsWithMarks.has(g.id)).length;
  }

  const webPushConfigured = isWebPushConfigured();
  const webPushSubscribed = webPushConfigured
    ? (await listPushSubscriptionsForUser(user.id)).length > 0
    : false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">안녕하세요, {user.name}님</h2>
        <p className="mt-1 text-sm text-stone-600">
          역할: {roleLabel(user.role)} · 가족 보고 방 {reportCount}건
          {latestSunday && (
            <>
              {" · "}
              <Link href={`/attendance/${latestSunday.id}`} className="underline">
                {latestSunday.title} 출석 미입력 가족 {missingAttendanceCount}곳
              </Link>
            </>
          )}
        </p>
      </div>

      <PushNotificationSettings
        configured={webPushConfigured}
        initialSubscribed={webPushSubscribed}
      />

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {myGroup && (
          <Card>
            <CardHeader title={`내 가족: ${myGroup.name}`} subtitle={myGroup.description ?? undefined} />
            <div className="px-4 py-3 sm:px-5">
              <p className="text-sm text-stone-600">가족원 {myMemberCount}명</p>
              <Link href="/my-group" className="mt-2 inline-block text-sm font-medium text-stone-800 underline">
                가족원·가족 보고 관리
              </Link>
            </div>
          </Card>
        )}

        <Card className={myGroup ? "lg:col-span-1 xl:col-span-1" : "lg:col-span-1"}>
          <CardHeader title="최근 리더 모임" subtitle="교안·기도회·배정 모자 연결" />
          <ul className="divide-y divide-stone-100">
            {meetings.map((m, i) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div>
                  <p className="font-medium text-stone-900">{m.title}</p>
                  <p className="text-sm text-stone-500">{formatDateTimeKo(m.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {meetingPlans[i] ? (
                    <Badge tone="green">조편성 완료</Badge>
                  ) : (
                    <Badge>조편성 없음</Badge>
                  )}
                  <Link href={`/meetings/${m.id}`} className="text-sm text-stone-700 underline">
                    보기
                  </Link>
                </div>
              </li>
            ))}
            {meetings.length === 0 && (
              <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">아직 등록된 모임이 없습니다.</li>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="배정 모자" subtitle="리더 모임 조 배정·자리 뽑기" />
          <div className="flex flex-wrap gap-3 px-4 py-3 sm:px-5">
            <Link href={SORTING_HAT_USER_PATH} className="text-sm font-medium text-stone-800 underline">
              조 배정·자리 뽑기
            </Link>
            {canManageSortingHat(user.role) && (
              <Link href={SORTING_HAT_ADMIN_PATH} className="text-sm font-medium text-stone-800 underline">
                배정 관리
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
