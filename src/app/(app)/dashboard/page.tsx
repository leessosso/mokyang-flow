import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardHeader } from "@/components/ui";
import { getCurrentUser, isPastorOrAdmin } from "@/lib/auth";
import { formatDateTimeKo, roleLabel } from "@/lib/format";
import { getGroupByCurrentLeader, listGroups } from "@/lib/store/groups";
import { listMeetings } from "@/lib/store/meetings";
import { countThreadsWithMessages } from "@/lib/store/reports";
import { listMarksBySunday, listWeeklySundaySlots } from "@/lib/store/attendance";
import {
  SORTING_HAT_ADMIN_PATH,
  SORTING_HAT_USER_PATH,
} from "@/lib/sorting-hat";
import { canManageApp } from "@/lib/types";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { isWebPushConfigured } from "@/lib/firebase-client";
import { listPushSubscriptionsForUser } from "@/lib/store/push-subscriptions";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const actor = await getCurrentUser();
  const manages = actor ? canManageApp(actor) : false;

  const meetings = (await listMeetings()).slice(0, 3);

  const myGroup = user.role === "LEADER" ? await getGroupByCurrentLeader(user.id) : null;

  const attendanceGroups = manages
    ? await listGroups()
    : myGroup
      ? [myGroup]
      : [];

  const reportGroups = isPastorOrAdmin(user.role)
    ? attendanceGroups
    : myGroup
      ? [myGroup]
      : [];

  const reportCount = await countThreadsWithMessages(reportGroups.map((g) => g.id));

  const currentWeek = (await listWeeklySundaySlots(1))[0] ?? null;
  const latestSunday = currentWeek?.sunday ?? null;
  let missingAttendanceCount = 0;
  if (latestSunday) {
    const marks = currentWeek?.persisted ? await listMarksBySunday(latestSunday.id) : [];
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
        <Card>
          <CardHeader title="최근 리더 모임" subtitle="기도회 · 교안 나눔 · 해설 · 광고" />
          <ul className="divide-y divide-stone-100">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="block px-4 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
                >
                  <p className="font-medium text-stone-900">{m.title}</p>
                  <p className="text-sm text-stone-500">{formatDateTimeKo(m.date)}</p>
                </Link>
              </li>
            ))}
            {meetings.length === 0 && (
              <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">아직 등록된 모임이 없습니다.</li>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="배정 모자" subtitle="리더 모임 조 배정·자리 뽑기" />
          <div className="divide-y divide-stone-100">
            <Link
              href={SORTING_HAT_USER_PATH}
              className="block px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
            >
              조 배정·자리 뽑기
            </Link>
            {manages && (
              <Link
                href={SORTING_HAT_ADMIN_PATH}
                className="block px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
              >
                배정 관리
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
