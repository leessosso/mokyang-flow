import { signOut } from "@/auth";
import type { OfficerTitle, Role } from "@/lib/types";
import { canManageApp } from "@/lib/types";
import { DeploySmokeBadge } from "@/components/deploy-smoke-badge";
import { AppMain } from "@/components/app-main";
import { AppNav, type NavItem } from "@/components/app-nav";
import { SORTING_HAT_ADMIN_PATH, SORTING_HAT_USER_PATH } from "@/lib/sorting-hat";

function navFor(
  user: { role: Role; officerTitle: OfficerTitle | null },
  familyReportHref: string,
): NavItem[] {
  const manages = canManageApp(user);
  const items: NavItem[] = [
    { href: "/dashboard", label: "대시보드" },
    { href: "/attendance", label: "출석" },
    { href: "/surveys", label: "참여조사" },
    { href: "/meetings", label: "리더 모임" },
    { href: familyReportHref, label: "가족 보고" },
  ];
  items.push(
    { href: "/announcements", label: "공지" },
    { href: SORTING_HAT_USER_PATH, label: "배정 모자" },
  );
  if (manages) {
    items.push(
      { href: "/groups", label: "가족" },
      { href: "/admin/handover", label: "가장·임원 관리" },
      { href: SORTING_HAT_ADMIN_PATH, label: "배정 관리" },
    );
  }
  return items;
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
      className={className}
    >
      <button
        type="submit"
        className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-stone-500 hover:bg-stone-100"
      >
        로그아웃
      </button>
    </form>
  );
}

export function AppShell({
  children,
  user,
  familyReportHref,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role; email: string; officerTitle: OfficerTitle | null };
  familyReportHref: string;
}) {
  const nav = navFor(user, familyReportHref);

  return (
    <div className="flex h-full min-h-screen flex-col bg-stone-50 text-stone-900 lg:flex-row">
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-stone-200 lg:bg-white">
        <div className="border-b border-stone-100 px-5 py-5">
          <h1 className="text-lg font-semibold text-stone-900">2청년회 운영</h1>
          <DeploySmokeBadge className="mt-2" />
        </div>
        <AppNav items={nav} variant="desktop" />
        <div className="mt-auto border-t border-stone-100 px-3 py-4">
          <p className="truncate px-3 text-sm font-medium">{user.name}</p>
          <p className="truncate px-3 text-xs text-stone-500">{user.email}</p>
          <LogoutButton className="mt-2" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-stone-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <h1 className="text-lg font-semibold text-stone-900">2청년회 운영</h1>
              <DeploySmokeBadge className="mt-1" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 text-right text-sm">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-stone-500">{user.email}</p>
              </div>
              <LogoutButton className="shrink-0" />
            </div>
          </div>
          <AppNav items={nav} variant="mobile" />
        </header>
        <AppMain>{children}</AppMain>
      </div>
    </div>
  );
}
