const KST = "Asia/Seoul";

/** Firestore에 저장된 ISO 시각을 서울 달력 날짜(YYYY-MM-DD)로 본다. */
export function kstDateKeyFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** 지금 시각의 서울 달력 날짜(YYYY-MM-DD). */
export function kstDateKeyNow(): string {
  return kstDateKeyFromIso(new Date().toISOString());
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** 서울 달력의 날짜와 요일(일=0). */
export function kstCalendar(date: Date): { dateKey: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAY_INDEX[get("weekday")];
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: weekday ?? 0,
  };
}

/** YYYY-MM-DD에 일수를 더한다. 한국은 서머타임이 없어 달력 날짜만 옮긴다. */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 오늘이 일요일이면 오늘, 아니면 가장 최근 일요일. */
export function mostRecentSundayKey(now = new Date()): string {
  const { dateKey, weekday } = kstCalendar(now);
  return shiftDateKey(dateKey, -weekday);
}

export function isKstSunday(now = new Date()): boolean {
  return kstCalendar(now).weekday === 0;
}

/** 이번 주일부터 과거로 count개의 일요일. */
export function recentSundayDateKeys(count: number, now = new Date()): string[] {
  const latest = mostRecentSundayKey(now);
  return Array.from({ length: count }, (_, i) => shiftDateKey(latest, -7 * i));
}

export function sundayTitleFromDateKey(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}월 ${day}일 주일`;
}

/** 서울 정오. UTC 자정으로 저장하면 날짜가 전날로 밀릴 수 있어 정오를 쓴다. */
export function dateKeyToKstNoonIso(dateKey: string): string {
  return `${dateKey}T12:00:00.000+09:00`;
}
