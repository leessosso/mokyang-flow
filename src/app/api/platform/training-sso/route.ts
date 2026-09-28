import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/store/users";
import {
  isTrainingSsoConfigured,
  mintTrainingSsoTicket,
  trainingSsoConsumeUrl,
} from "@/lib/platform/training-sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.mustChangePassword) {
    const changeUrl = new URL("/change-password", request.url);
    return NextResponse.redirect(changeUrl);
  }

  if (!isTrainingSsoConfigured()) {
    return NextResponse.json(
      { error: "PLATFORM_SSO_SECRET is not configured" },
      { status: 503 },
    );
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ticket = await mintTrainingSsoTicket(user);
  const destination = trainingSsoConsumeUrl(ticket, request.url);
  return NextResponse.redirect(destination);
}
