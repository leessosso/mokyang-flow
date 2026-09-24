import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import { ensureFirebaseApp } from "@/lib/firebase-admin";
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

  const messaging = getMessaging(ensureFirebaseApp());
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

/** 가족 보고(가장 작성) 시 목사·관리자 구독자에게 알림.
 * Phase 2: 섬김(기도회 인도 등) 담당을 로그인 User에 매핑하는 필드 추가 후, 본인 담당 알림에 재사용. */
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
