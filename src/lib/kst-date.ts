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
