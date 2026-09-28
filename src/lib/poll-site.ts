/** poll 사이트 기본 URL. 운영 환경에서는 POLL_SITE_URL로 덮어쓸 수 있다. */
export const DEFAULT_POLL_SITE_URL = "https://leessosso.github.io/poll/";

export function getPollSiteUrl(): string {
  const fromEnv = process.env.POLL_SITE_URL?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_POLL_SITE_URL;
}
