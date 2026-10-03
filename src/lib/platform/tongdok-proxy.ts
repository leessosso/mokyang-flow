/**
 * 통독(tongdok-mu) same-domain 프록시 설정.
 * next.config.ts rewrites와 문서에서 동일한 env 이름을 씁니다.
 */

export const TONGDOK_PATH_PREFIX = "/tongdok";

/** Vercel / 로컬에서 통독 앱 배포 URL (trailing slash 없음). */
export const TONGDOK_ORIGIN_ENV = "TONGDOK_ORIGIN";

export const DEFAULT_TONGDOK_ORIGIN = "https://tongdok-mu.vercel.app";

/** Next.js basePath `/tongdok` 루트 페이지 RSC flight 파일명 (`/tongdok/tongdok.rsc`). */
export const TONGDOK_ROOT_RSC_SEGMENT = "tongdok.rsc";

/**
 * rewrite 대상 origin. env 미설정 시 프로덕션 기본 URL(라이브 tongdok-mu).
 * 로컬에서 프록시를 끄려면 `TONGDOK_ORIGIN=` 빈 값으로 두면 next.config에서 rewrite를 생략할 수 있음.
 */
export function resolveTongdokOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[TONGDOK_ORIGIN_ENV]?.trim();
  if (raw === "") return null;
  if (raw) return normalizeTongdokOrigin(raw);
  if (env.NODE_ENV === "production") {
    return DEFAULT_TONGDOK_ORIGIN;
  }
  return null;
}

/** origin에 path(`/tongdok`)가 붙어 있으면 제거해 이중 prefix rewrite를 막습니다. */
export function normalizeTongdokOrigin(origin: string): string {
  let normalized = origin.replace(/\/$/, "");
  if (normalized.endsWith(TONGDOK_PATH_PREFIX)) {
    normalized = normalized.slice(0, -TONGDOK_PATH_PREFIX.length);
  }
  return normalized;
}

/** 셸 NextAuth·rewrite에서 로그인 없이 통과할 통독 관련 pathname. */
export function isTongdokShellPublicPath(pathname: string): boolean {
  if (pathname === TONGDOK_PATH_PREFIX) return true;
  if (pathname.startsWith(`${TONGDOK_PATH_PREFIX}/`)) return true;
  // basePath 앱 RSC: 호스트 루트의 `/tongdok.rsc` (슬래시 없음)
  if (pathname.startsWith(`${TONGDOK_PATH_PREFIX}.`)) return true;
  return false;
}

/**
 * 셸 pathname → tongdok-mu upstream pathname (path만, origin 없음).
 * 매칭되지 않으면 null.
 */
export function tongdokShellPathToUpstreamPath(pathname: string): string | null {
  if (!isTongdokShellPublicPath(pathname)) return null;
  return pathname;
}

export type TongdokRewriteRule = { source: string; destination: string };

/**
 * tongdok-mu `basePath: '/tongdok'` 배포용 shell rewrite 규칙.
 * `beforeFiles`에 넣어 셸이 `/tongdok.rsc`를 자체 RSC로 처리하지 않게 합니다.
 */
export function tongdokRewriteRules(origin: string): TongdokRewriteRule[] {
  const base = normalizeTongdokOrigin(origin);
  const upstream = (path: string) => `${base}${path}`;

  return [
    {
      source: `${TONGDOK_PATH_PREFIX}.rsc`,
      destination: upstream(`${TONGDOK_PATH_PREFIX}.rsc`),
    },
    {
      source: TONGDOK_PATH_PREFIX,
      destination: upstream(TONGDOK_PATH_PREFIX),
    },
    {
      source: `${TONGDOK_PATH_PREFIX}/:path*`,
      destination: upstream(`${TONGDOK_PATH_PREFIX}/:path*`),
    },
  ];
}

/**
 * @deprecated {@link tongdokRewriteRules} 사용. 하위 호환용 단일 destination.
 */
export function tongdokRewriteDestination(origin: string): string {
  return `${normalizeTongdokOrigin(origin)}${TONGDOK_PATH_PREFIX}`;
}
