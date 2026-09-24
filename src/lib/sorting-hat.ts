/** 로그인 셸 안의 메뉴 경로 */
export const SORTING_HAT_USER_PATH = "/hat";
export const SORTING_HAT_ADMIN_PATH = "/hat/admin";

/** 로그인 없이 열리는 정적 HTML (iframe src) */
export const SORTING_HAT_USER_EMBED = "/sorting-hat/index.html";
export const SORTING_HAT_ADMIN_EMBED = "/sorting-hat/admin.html";

const MEETING_RETURN = /^\/meetings\/([A-Za-z0-9_-]+)$/;

/** 리더 모임에서 배정 모자로 들어올 때 되돌릴 경로. 모임 상세만 허용한다. */
export function meetingReturnPath(meetingId: string): string {
  return `/meetings/${meetingId}`;
}

export function meetingIdFromReturnParam(value: string | undefined): string | null {
  if (!value) return null;
  return value.match(MEETING_RETURN)?.[1] ?? null;
}

export function sortingHatEmbedSrc(embedPath: string, meetingId: string | null): string {
  if (!meetingId) return embedPath;
  const params = new URLSearchParams({ return: meetingReturnPath(meetingId) });
  return `${embedPath}?${params.toString()}`;
}
