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

export async function upsertPushSubscription(data: {
  userId: string;
  token: string;
  userAgent?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const ref = pushSubscriptionsCol.doc(docIdForToken(data.token));
  const existing = await ref.get();
  const payload: PushSubscriptionRecord = {
    userId: data.userId,
    token: data.token,
    createdAt: existing.exists ? existing.data()!.createdAt : now,
    lastSeenAt: now,
    ...(data.userAgent ? { userAgent: data.userAgent } : {}),
  };
  await ref.set(payload, { merge: true });
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

export async function listPushTokensForUserIds(userIds: string[]): Promise<string[]> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return [];

  const tokens: string[] = [];
  const chunkSize = 10;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const snap = await pushSubscriptionsCol.where("userId", "in", chunk).get();
    for (const doc of snap.docs) {
      const token = doc.data().token;
      if (token) tokens.push(token);
    }
  }
  return [...new Set(tokens)];
}
