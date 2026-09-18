import Link from "next/link";
import { signOut } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { isPastorOrAdmin } from "@/lib/auth";

const navForPastor = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/groups", label: "조 관리" },
  { href: "/meetings", label: "조장 모임" },
  { href: "/worship", label: "예배 좌석" },
  { href: "/reports", label: "양육 보고" },
  { href: "/admin/handover", label: "조장 인수인계" },
];

const navForLeader = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/my-group", label: "내 조" },
  { href: "/meetings", label: "조장 모임" },
  { href: "/worship", label: "예배 좌석" },
  { href: "/reports", label: "양육 보고" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role; email: string };
}) {
  const nav = isPastorOrAdmin(user.role) ? navForPastor : navForLeader;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              2청년회
            </p>
            <h1 className="text-lg font-semibold text-stone-900">조장 운영</h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-stone-500">{user.email}</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
            >
              {item.label}
            </Link>
          ))}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="ml-auto"
          >
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-500 hover:bg-stone-100"
            >
              로그아웃
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
