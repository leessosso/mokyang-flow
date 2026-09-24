import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { getGroupByCurrentLeader } from "@/lib/store/groups";
import { getUserById } from "@/lib/store/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const full = await getUserById(session.user.id);
  const leadsFamily = full?.role === "LEADER" ? !!(await getGroupByCurrentLeader(full.id)) : false;

  return (
    <AppShell
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
        officerTitle: full?.officerTitle ?? null,
      }}
      leadsFamily={leadsFamily}
    >
      {children}
    </AppShell>
  );
}
