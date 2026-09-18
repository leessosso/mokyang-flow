import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createMember } from "@/app/actions";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export default async function MyGroupPage() {
  const session = await auth();
  if (session!.user.role !== Role.LEADER) redirect("/dashboard");

  const group = await prisma.group.findFirst({
    where: { currentLeaderId: session!.user.id },
    include: {
      members: {
        orderBy: { name: "asc" },
        include: {
          pastoralThread: {
            include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
          },
        },
      },
    },
  });

  if (!group) {
    return (
      <Card className="p-6 text-center text-stone-600">
        현재 담당 조가 없습니다. 목사에게 조장 배정을 요청해 주세요.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{group.name}</h2>
        <p className="text-sm text-stone-600">{group.description}</p>
      </div>

      <Card>
        <CardHeader title="조원 양육" subtitle="조원을 선택하면 목사와의 비공개 스레드가 열립니다" />
        <ul className="divide-y divide-stone-100">
          {group.members.map((m) => (
            <li key={m.id} className="px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900">{m.name}</p>
                  {m.pastoralThread?.messages[0] && (
                    <p className="mt-1 line-clamp-2 text-sm text-stone-500">
                      최근: {m.pastoralThread.messages[0].body}
                    </p>
                  )}
                </div>
                <Link
                  href={`/reports/${m.id}`}
                  className="shrink-0 rounded-lg bg-stone-800 px-3 py-2 text-sm text-white"
                >
                  보고 작성
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <form
          action={async (fd) => {
            "use server";
            await createMember(group.id, fd.get("name") as string);
          }}
          className="flex gap-2 border-t border-stone-100 p-4"
        >
          <Input name="name" required placeholder="새 조원 이름" />
          <Button type="submit">추가</Button>
        </form>
      </Card>
    </div>
  );
}
