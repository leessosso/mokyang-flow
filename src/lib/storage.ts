import { get, put } from "@vercel/blob";

function missingBlobTokenMessage() {
  return (
    "BLOB_READ_WRITE_TOKEN이 없습니다. Vercel 프로젝트에 Blob 스토어를 연결하거나 로컬 .env에 토큰을 넣어 주세요."
  );
}

function assertBlobReadWriteToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(missingBlobTokenMessage());
  }
}

/**
 * 교안/해설지/악보 파일은 Firestore가 아니라 Vercel Blob(비공개)에 둔다.
 * Firestore에는 storageKey(pathname)만 저장한다.
 */
export async function uploadMeetingFile(params: {
  meetingId: string;
  kind: string;
  fileName: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  assertBlobReadWriteToken();
  const safeName = params.fileName.replace(/[^\w.\-가-힣 ]/g, "_");
  const storageKey = `meetings/${params.meetingId}/${params.kind.toLowerCase()}/${Date.now()}-${safeName}`;
  await put(storageKey, params.buffer, {
    access: "private",
    contentType: params.contentType ?? "application/octet-stream",
    addRandomSuffix: false,
  });
  return storageKey;
}

export type MeetingFileBlob = NonNullable<Awaited<ReturnType<typeof getMeetingFileBlob>>>;

/** 로그인·권한 검사를 마친 라우트에서만 호출한다. */
export async function getMeetingFileBlob(storageKey: string) {
  assertBlobReadWriteToken();
  const result = await get(storageKey, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return null;
  }
  return result;
}

/**
 * 미리보기 등 브라우저가 직접 fetch하는 URL이 필요할 때 쓴다.
 * 이 앱은 동일 출처 API 라우트로 스트리밍하므로, 서명 URL 대신 인증된 경로를 반환한다.
 */
export function getAuthenticatedAssetPath(
  meetingId: string,
  assetId: string,
): string {
  return `/api/meetings/${meetingId}/assets/${assetId}`;
}
