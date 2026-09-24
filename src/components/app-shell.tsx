import { signOut } from "@/auth";
import type { Role } from "@/lib/types";
import { DeploySmokeBadge } from "@/components/deploy-smoke-badge";
import { AppMain } from "@/components/app-main";
import { AppNav, type NavItem } from "@/components/app-nav";
import { isPastorOrAdmin } from "@/lib/auth";
import {
  SORTING_HAT_ADMIN_PATH,
  SORTING_HAT_USER_PATH,
  canManageSortingHat,
} from "@/lib/sorting-hat";

const navForPastor: NavItem[] = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/groups", label: "가족" },
  { href: "/attendance", label: "출석" },
  { href: "/surveys", label: "참여조사" },
  { href: "/announcements", label: "공지" },
  { href: "/meetings", label: "리더 모임" },
  { href: "/reports", label: "가족 보고" },
  { href: "/admin/handover", label: "가장·임원 관리" },
];

const navForLeader: NavItem[] = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/my-group", label: "내 가족" },
  { href: "/attendance", label: "출석" },
  { href: "/surveys", label: "참여조사" },
  { href: "/announcements", label: "공지" },
  { href: "/meetings", label: "리더 모임" },
  { href: "/reports", label: "가족 보고" },
];

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
}: {
  children: React.ReactNode;
  user: { name: string; role: Role; email: string };
}) {
  const nav: NavItem[] = [
    ...(isPastorOrAdmin(user.role) ? navForPastor : navForLeader),
    { href: SORTING_HAT_USER_PATH, label: "배정 모자" },
  ];
  if (canManageSortingHat(user.role)) {
    nav.push({ href: SORTING_HAT_ADMIN_PATH, label: "배정 관리" });
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-stone-50 text-stone-900 lg:flex-row">
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-stone-200 lg:bg-white">
        <div className="border-b border-stone-100 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            2청년회
          </p>
          <h1 className="mt-0.5 text-lg font-semibold text-stone-900">리더 운영</h1>
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
              <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                2청년회
              </p>
              <h1 className="text-lg font-semibold text-stone-900">리더 운영</h1>
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
