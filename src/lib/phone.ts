/** 로그인·조회용 전화번호 정규화 (숫자만, 국가번호 82 → 0). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function isPhoneLike(input: string): boolean {
  const normalized = normalizePhone(input.trim());
  return normalized.length >= 9 && normalized.length <= 11 && /^\d+$/.test(normalized);
}
