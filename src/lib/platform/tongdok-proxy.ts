/**
 * 통독(tongdok-mu) same-domain 프록시 설정.
 * next.config.ts rewrites와 문서에서 동일한 env 이름을 씁니다.
 */

export const TONGDOK_PATH_PREFIX = "/tongdok";

/** Vercel / 로컬에서 통독 앱 배포 URL (trailing slash 없음). */
export const TONGDOK_ORIGIN_ENV = "TONGDOK_ORIGIN";

export const DEFAULT_TONGDOK_ORIGIN = "https://tongdok-mu.vercel.app";

/**
 * rewrite 대상 origin. env 미설정 시 프로덕션 기본 URL(라이브 tongdok-mu).
 * 로컬에서 프록시를 끄려면 `TONGDOK_ORIGIN=` 빈 값으로 두면 next.config에서 rewrite를 생략할 수 있음.
 */
export function resolveTongdokOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[TONGDOK_ORIGIN_ENV]?.trim();
  if (raw === "") return null;
  if (raw) return raw.replace(/\/$/, "");
  if (env.NODE_ENV === "production") {
    return DEFAULT_TONGDOK_ORIGIN;
  }
  return null;
}

/**
 * tongdok-mu `basePath: '/tongdok'` 배포 후 shell rewrite destination.
 * 패턴: `{origin}/tongdok` 및 `{origin}/tongdok/:path*`
 */
export function tongdokRewriteDestination(origin: string): string {
  return `${origin}${TONGDOK_PATH_PREFIX}`;
}
