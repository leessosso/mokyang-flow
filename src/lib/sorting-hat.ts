import type { Role } from "@/lib/types";

/** 로그인 셸 안의 메뉴 경로 */
export const SORTING_HAT_USER_PATH = "/hat";
export const SORTING_HAT_ADMIN_PATH = "/hat/admin";

/** 로그인 없이 열리는 정적 HTML (iframe src) */
export const SORTING_HAT_USER_EMBED = "/sorting-hat/index.html";
export const SORTING_HAT_ADMIN_EMBED = "/sorting-hat/admin.html";

/** 이후 admin.html의 비밀번호(7777)를 이 역할 세션으로 대체할 예정. 지금은 페이지 접근을 막지 않는다. */
export const SORTING_HAT_ADMIN_ROLES: Role[] = ["PASTOR", "ADMIN"];

export function canManageSortingHat(role: Role) {
  return SORTING_HAT_ADMIN_ROLES.includes(role);
}
