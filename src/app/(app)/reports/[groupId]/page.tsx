import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FamilyReportThread } from "@/components/family-report-thread";
import { Card, CardHeader } from "@/components/ui";
import { isPastorOrAdmin, leaderCanAccessGroup } from "@/lib/auth";
import { getGroupById, listMembersByGroup } from "@/lib/store/groups";
import { getThreadByGroup, listMessagesByThread } from "@/lib/store/reports";
import { getUsersByIds } from "@/lib/store/users";

export default async function FamilyReportPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth();
  const user = session!.user;

  const group = await getGroupById(groupId);
  if (!group) notFound();

  if (user.role === "LEADER") {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) notFound();
  } else if (!isPastorOrAdmin(user.role)) {
    notFound();
  }

  const [members, thread, leader] = await Promise.all([
    listMembersByGroup(groupId),
    getThreadByGroup(groupId),
    group.currentLeaderId ? getUsersByIds([group.currentLeaderId]) : Promise.resolve(new Map()),
  ]);

  const rawMessages = thread ? await listMessagesByThread(thread.id) : [];
  const authors = await getUsersByIds(rawMessages.map((m) => m.authorId));
  const messages = rawMessages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    aboutMemberId: m.aboutMemberId,
    author: {
      name: authors.get(m.authorId)?.name ?? "알 수 없음",
      role: authors.get(m.authorId)?.role ?? "LEADER",
    },
  }));

  const leaderName = group.currentLeaderId ? leader.get(group.currentLeaderId)?.name : undefined;

  return (
    <div className="space-y-4">
      {isPastorOrAdmin(user.role) && (
        <Link href="/reports" className="text-sm text-stone-600 underline">← 가족 보고 목록</Link>
      )}
      <Card className="max-w-3xl p-4 sm:p-6">
        <CardHeader
          title={group.name}
          subtitle={`담당 가장: ${leaderName ?? "미배정"}`}
        />
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <FamilyReportThread
            groupId={group.id}
            groupName={group.name}
            members={members.map((m) => ({ id: m.id, name: m.name }))}
            messages={messages}
          />
        </div>
      </Card>
    </div>
  );
}
