import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupByCurrentLeader } from "@/lib/store/groups";

/** 예전 「내 가족」 주소. 가장은 가족 보고 방으로, 그 외에는 대시보드로 보냅니다. */
export default async function MyGroupPage() {
  const session = await auth();
  if (session!.user.role === "LEADER") {
    const group = await getGroupByCurrentLeader(session!.user.id);
    if (group) redirect(`/reports/${group.id}`);
  }
  redirect("/dashboard");
}
