/**
 * 훈련(class-management) same-domain 프록시 설정.
 * next.config.ts rewrites와 문서에서 동일한 env 이름을 씁니다.
 */

export const TRAINING_PATH_PREFIX = "/training";

/** Vercel / 로컬에서 class-management 배포 URL (trailing slash 없음). */
export const TRAINING_ORIGIN_ENV = "TRAINING_ORIGIN";

/** 하위 호환·다른 팀 명칭용 alias */
export const CLASS_MANAGEMENT_URL_ENV = "CLASS_MANAGEMENT_URL";

export const DEFAULT_TRAINING_ORIGIN =
  "https://class-management-chi-amber.vercel.app";

/**
 * rewrite 대상 origin. env 미설정 시 프로덕션 기본 URL(라이브 class-management).
 * 로컬에서 프록시를 끄려면 `TRAINING_ORIGIN=` 빈 값으로 두면 next.config에서 rewrite를 생략할 수 있음.
 */
export function resolveTrainingOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw =
    env[TRAINING_ORIGIN_ENV]?.trim() ||
    env[CLASS_MANAGEMENT_URL_ENV]?.trim();
  if (raw === "") return null;
  if (raw) return raw.replace(/\/$/, "");
  if (env.NODE_ENV === "production") {
    return DEFAULT_TRAINING_ORIGIN;
  }
  return null;
}

/** class-management에 `basePath: '/training'` 일 때 쓰는 rewrite destination prefix */
export function trainingRewriteDestination(origin: string): string {
  return `${origin}${TRAINING_PATH_PREFIX}`;
}
