import { kstDateKeyFromIso } from "@/lib/kst-date";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Asia/Seoul 달력 날짜(YYYY-MM-DD) 형식인지 검사한다. */
export function isValidPollDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const check = new Date(utc);
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

/** 지정한 투표일과 서울 기준 오늘이 같으면 배너를 노출한다. */
export function isPollBannerDay(
  pollDateKey: string | null | undefined,
  now = new Date(),
): boolean {
  if (!pollDateKey || !isValidPollDateKey(pollDateKey)) return false;
  return pollDateKey === kstDateKeyFromIso(now.toISOString());
}
