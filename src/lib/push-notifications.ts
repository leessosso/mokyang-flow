import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { ensureApp } from "@/lib/firebase-admin";
import { listUsersByRole } from "@/lib/store/users";
import { listPushTokensForUserIds } from "@/lib/store/push-subscriptions";

export type WebPushPayload = {
  title: string;
  body: string;
  url: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function sendWebPushToTokens(tokens: string[], payload: WebPushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const messaging = getMessaging(ensureApp());
  const messageBase: Omit<MulticastMessage, "tokens"> = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      url: payload.url,
    },
    webpush: {
      fcmOptions: {
        link: payload.url,
      },
      notification: {
        title: payload.title,
        body: payload.body,
        icon: "/icons/icon-192.png",
      },
    },
  };

  for (const batch of chunk(tokens, 500)) {
    const res = await messaging.sendEachForMulticast({ ...messageBase, tokens: batch });
    if (res.failureCount > 0) {
      console.warn(
        `[push] ${res.failureCount}/${batch.length} tokens failed`,
        res.responses
          .map((r, i) => (r.success ? null : { token: batch[i], error: r.error?.message }))
          .filter(Boolean),
      );
    }
  }
}

/** 가족 보고(가장 작성) 시 목사·관리자 구독자에게 알림. */
export async function notifyPastorsAndAdminsOfFamilyReport(options: {
  groupId: string;
  groupName: string;
  leaderName: string;
  preview: string;
}): Promise<void> {
  const [pastors, admins] = await Promise.all([
    listUsersByRole("PASTOR"),
    listUsersByRole("ADMIN"),
  ]);
  const userIds = [...pastors, ...admins].map((u) => u.id);
  const tokens = await listPushTokensForUserIds(userIds);
  if (tokens.length === 0) return;

  const url = `/reports/${options.groupId}`;
  const body =
    options.preview.length > 80 ? `${options.preview.slice(0, 80)}…` : options.preview;

  await sendWebPushToTokens(tokens, {
    title: `가족 보고 · ${options.groupName}`,
    body: `${options.leaderName}: ${body}`,
    url,
  });
}

/** 섬김 담당이 모임 등에 배정되면 해당 로그인 사용자(들)에게 푸시. */
export async function notifyUsersOfServingDutyAssignment(options: {
  userIds: string[];
  dutyLabel: string;
  meetingTitle: string;
  meetingDateIso: string;
  meetingId: string;
}): Promise<void> {
  const uniqueUserIds = [...new Set(options.userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) return;

  const tokens = await listPushTokensForUserIds(uniqueUserIds);
  if (tokens.length === 0) return;

  const dateLabel = new Date(options.meetingDateIso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  await sendWebPushToTokens(tokens, {
    title: `섬김 담당 · ${options.dutyLabel}`,
    body: `${options.meetingTitle} (${dateLabel})`,
    url: `/meetings/${options.meetingId}`,
  });
}

/** 주일 출석 입력 리마인더 — 담당 가족이 있는 가장(LEADER)에게 푸시. */
export async function notifyLeadersOfAttendanceReminder(options: {
  userIds: string[];
  sundayId: string;
  sundayTitle: string;
  sundayDateIso: string;
}): Promise<void> {
  const uniqueUserIds = [...new Set(options.userIds)].filter(Boolean);
  if (uniqueUserIds.length === 0) return;

  const tokens = await listPushTokensForUserIds(uniqueUserIds);
  if (tokens.length === 0) return;

  const dateLabel = new Date(options.sundayDateIso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  await sendWebPushToTokens(tokens, {
    title: `주일 출석 · ${options.sundayTitle}`,
    body: `${dateLabel} — 가족원 1-3부·4부·가족모임 출석을 입력해 주세요.`,
    url: `/attendance/${options.sundayId}`,
  });
}
