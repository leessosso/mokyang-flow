import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMeetingAssetById } from "@/lib/store/meetings";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ meetingId: string; assetId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { meetingId, assetId } = await params;
  const asset = await getMeetingAssetById(assetId);
  if (!asset || asset.meetingId !== meetingId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const url = await getSignedDownloadUrl(asset.storageKey);
  return NextResponse.redirect(url);
}
