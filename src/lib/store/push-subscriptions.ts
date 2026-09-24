import { createHash } from "node:crypto";
import { getDb } from "@/lib/firebase-admin";
import { pushSubscriptionsCol, withId } from "@/lib/store/collections";

export type PushSubscriptionRecord = {
  userId: string;
  token: string;
  createdAt: string;
  lastSeenAt: string;
  userAgent?: string;
};

function docIdForToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

/** 같은 userId의 다른 토큰 문서를 제거해 사용자당 하나의 활성 구독만 유지합니다. */
async function deleteSiblingPushSubscriptions(userId: string, keepDocId: string): Promise<void> {
  const snap = await pushSubscriptionsCol.where("userId", "==", userId).get();
  const siblings = snap.docs.filter((doc) => doc.id !== keepDocId);
  if (siblings.length === 0) return;
  const batch = getDb().batch();
  for (const doc of siblings) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function upsertPushSubscription(data: {
  userId: string;
  token: string;
  userAgent?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const docId = docIdForToken(data.token);
  const ref = pushSubscriptionsCol.doc(docId);
  const existing = await ref.get();
  const payload: PushSubscriptionRecord = {
    userId: data.userId,
    token: data.token,
    createdAt: existing.exists ? existing.data()!.createdAt : now,
    lastSeenAt: now,
    ...(data.userAgent ? { userAgent: data.userAgent } : {}),
  };
  await ref.set(payload, { merge: true });
  await deleteSiblingPushSubscriptions(data.userId, docId);
}

export async function deletePushSubscription(userId: string, token: string): Promise<void> {
  const ref = pushSubscriptionsCol.doc(docIdForToken(token));
  const snap = await ref.get();
  if (!snap.exists) return;
  if (snap.data()?.userId !== userId) return;
  await ref.delete();
}

export async function deletePushSubscriptionsForUser(userId: string): Promise<number> {
  const snap = await pushSubscriptionsCol.where("userId", "==", userId).get();
  if (snap.empty) return 0;
  const batch = getDb().batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

export async function listPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
  const snap = await pushSubscriptionsCol.where("userId", "==", userId).get();
  return snap.docs.map(withId);
}

/** 알림을 켠(구독 토큰이 있는) 로그인 사용자 id 목록 */
export async function listSubscribedUserIds(): Promise<string[]> {
  const snap = await pushSubscriptionsCol.get();
  const ids = new Set<string>();
  for (const doc of snap.docs) {
    const userId = doc.data().userId;
    if (userId) ids.add(userId);
  }
  return [...ids];
}

/** 사용자당 `lastSeenAt`이 가장 최근인 구독 토큰 하나만 반환합니다. */
export async function listPushTokensForUserIds(userIds: string[]): Promise<string[]> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return [];

  const latestByUserId = new Map<string, { token: string; lastSeenAt: string }>();
  const chunkSize = 10;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const snap = await pushSubscriptionsCol.where("userId", "in", chunk).get();
    for (const doc of snap.docs) {
      const { userId, token, lastSeenAt, createdAt } = doc.data();
      if (!userId || !token) continue;
      const seenAt = lastSeenAt || createdAt || "";
      const prev = latestByUserId.get(userId);
      if (!prev || seenAt > prev.lastSeenAt) {
        latestByUserId.set(userId, { token, lastSeenAt: seenAt });
      }
    }
  }
  return [...new Set(latestByUserId.values().map((v) => v.token))];
}
