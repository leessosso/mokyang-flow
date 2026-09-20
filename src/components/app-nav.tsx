"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/hat") return pathname === "/hat";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav({
  items,
  variant,
}: {
  items: NavItem[];
  variant: "mobile" | "desktop";
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                active
                  ? "bg-stone-800 text-white"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-stone-800 font-medium text-white"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
