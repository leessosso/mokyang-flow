import { bucket } from "@/lib/firebase-admin";

/**
 * 교안/해설지/악보 파일은 Firestore가 아니라 Firebase Storage에 둔다.
 * Firestore에는 storageKey(경로)만 저장한다.
 */
export async function uploadMeetingFile(params: {
  meetingId: string;
  kind: string;
  fileName: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const safeName = params.fileName.replace(/[^\w.\-가-힣 ]/g, "_");
  const storageKey = `meetings/${params.meetingId}/${params.kind.toLowerCase()}/${Date.now()}-${safeName}`;
  const file = bucket.file(storageKey);
  await file.save(params.buffer, {
    contentType: params.contentType ?? "application/octet-stream",
    resumable: false,
  });
  return storageKey;
}

/** 로그인 세션이 있는 사용자만 다운로드 라우트를 통해 접근하도록 만료 있는 URL을 발급한다. */
export async function getSignedDownloadUrl(storageKey: string): Promise<string> {
  const [url] = await bucket.file(storageKey).getSignedUrl({
    action: "read",
    expires: Date.now() + 5 * 60 * 1000,
  });
  return url;
}
