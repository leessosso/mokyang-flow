import { runAttendanceReminderCron } from "@/lib/attendance-reminder-cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) return unauthorized();

  try {
    const result = await runAttendanceReminderCron();
    return Response.json(result);
  } catch (err) {
    console.error("[cron] attendance-reminder failed", err);
    return Response.json({ status: "error", message: String(err) }, { status: 500 });
  }
}
