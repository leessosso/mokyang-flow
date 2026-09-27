import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canViewMeetingAsset, getAssetPreviewKind } from "@/lib/meeting-assets";
import { getMeetingAssetById } from "@/lib/store/meetings";
import { getUserById } from "@/lib/store/users";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ meetingId: string; assetId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const actor = await getUserById(session.user.id);
  if (!actor) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { meetingId, assetId } = await params;
  const asset = await getMeetingAssetById(assetId);
  if (!asset || asset.meetingId !== meetingId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!canViewMeetingAsset(asset, actor)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const url = await getSignedDownloadUrl(asset.storageKey);
  const { searchParams } = new URL(req.url);
  if (searchParams.get("intent") === "preview") {
    return NextResponse.json({
      url,
      previewKind: getAssetPreviewKind(asset.fileName),
      fileName: asset.fileName,
    });
  }

  return NextResponse.redirect(url);
}
