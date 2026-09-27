import { canManageApp, type MeetingAsset, type User } from "@/lib/types";

export function isCommentaryAssetPublished(asset: MeetingAsset): boolean {
  if (asset.kind !== "LESSON_COMMENTARY") return true;
  return asset.published === true;
}

/** 모임 자료 열람·다운로드·미리보기 권한 */
export function canViewMeetingAsset(
  asset: MeetingAsset,
  viewer: Pick<User, "id" | "role" | "officerTitle">,
): boolean {
  if (isCommentaryAssetPublished(asset)) return true;
  return canManageApp(viewer) || asset.uploadedById === viewer.id;
}

export type AssetPreviewKind = "pdf" | "image" | "none";

export function getAssetPreviewKind(fileName: string): AssetPreviewKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(lower)) return "image";
  return "none";
}
