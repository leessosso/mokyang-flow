import { verifyPassword } from "@/lib/password";
import { isPhoneLike, normalizePhone } from "@/lib/phone";
import { getUserByName, getUsersByPhone } from "@/lib/store/users";
import type { User } from "@/lib/types";

export type LoginFailureReason =
  | "missing"
  | "email_not_allowed"
  | "duplicate_name"
  | "invalid";

export type LoginResolveResult =
  | { ok: true; user: User }
  | { ok: false; reason: LoginFailureReason };

function looksLikeEmail(identifier: string): boolean {
  return identifier.includes("@");
}

async function verifyUserPassword(user: User, password: string): Promise<boolean> {
  return verifyPassword(password, user.passwordHash);
}

async function resolveByPhone(phoneInput: string, password: string): Promise<LoginResolveResult> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, reason: "invalid" };

  const users = await getUsersByPhone(phone);
  if (users.length === 0) return { ok: false, reason: "invalid" };
  if (users.length > 1) return { ok: false, reason: "invalid" };

  const user = users[0]!;
  const ok = await verifyUserPassword(user, password);
  if (!ok) return { ok: false, reason: "invalid" };
  return { ok: true, user };
}

async function resolveByName(name: string, password: string): Promise<LoginResolveResult> {
  const candidates = await getUserByName(name);
  if (candidates.length === 0) return { ok: false, reason: "invalid" };
  if (candidates.length > 1) return { ok: false, reason: "duplicate_name" };

  const user = candidates[0]!;
  const ok = await verifyUserPassword(user, password);
  if (!ok) return { ok: false, reason: "invalid" };
  return { ok: true, user };
}

/** 이름 또는 전화번호 + 비밀번호로 로그인 계정을 찾는다. 이메일 식별자는 거부한다. */
export async function resolveLoginUser(
  identifier: string,
  password: string,
): Promise<LoginResolveResult> {
  const trimmedId = identifier.trim();
  if (!trimmedId || !password) return { ok: false, reason: "missing" };
  if (looksLikeEmail(trimmedId)) return { ok: false, reason: "email_not_allowed" };

  if (isPhoneLike(trimmedId)) {
    return resolveByPhone(trimmedId, password);
  }

  const byName = await resolveByName(trimmedId, password);
  if (byName.ok || byName.reason === "duplicate_name") return byName;

  if (normalizePhone(trimmedId).length >= 9) {
    return resolveByPhone(trimmedId, password);
  }

  return byName;
}

export function userMustChangePassword(user: User): boolean {
  return user.mustChangePassword === true;
}
