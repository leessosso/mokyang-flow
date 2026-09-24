"use server";

import { auth } from "@/auth";
import {
  deletePushSubscription,
  deletePushSubscriptionsForUser,
  listPushSubscriptionsForUser,
  upsertPushSubscription,
} from "@/lib/store/push-subscriptions";

async function sessionUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export async function registerPushSubscription(
  token: string,
  userAgent?: string,
): Promise<{ ok?: true; error?: string }> {
  try {
    const userId = await sessionUserId();
    const trimmed = token.trim();
    if (!trimmed) return { error: "유효하지 않은 토큰입니다." };
    await upsertPushSubscription({ userId, token: trimmed, userAgent });
    return { ok: true };
  } catch {
    return { error: "로그인이 필요합니다." };
  }
}

export async function unregisterPushSubscription(token?: string): Promise<{ ok?: true; error?: string }> {
  try {
    const userId = await sessionUserId();
    if (token?.trim()) {
      await deletePushSubscription(userId, token.trim());
    } else {
      await deletePushSubscriptionsForUser(userId);
    }
    return { ok: true };
  } catch {
    return { error: "로그인이 필요합니다." };
  }
}

export async function getPushSubscriptionStatus(): Promise<boolean> {
  try {
    const userId = await sessionUserId();
    const subs = await listPushSubscriptionsForUser(userId);
    return subs.length > 0;
  } catch {
    return false;
  }
}
