"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";

const AXES = [
  { id: "leader", href: "/dashboard", label: "리더" },
  { id: "training", href: TRAINING_SSO_ENTRY_PATH, label: "훈련" },
] as const;

function isTrainingPath(pathname: string) {
  return pathname === "/training" || pathname.startsWith("/training/");
}

export function PlatformPrimaryNav() {
  const pathname = usePathname();
  const trainingActive = isTrainingPath(pathname);

  return (
    <nav
      className="flex gap-1"
      aria-label="플랫폼 주 메뉴"
    >
      {AXES.map((axis) => {
        const active = axis.id === "training" ? trainingActive : !trainingActive;
        return (
          <Link
            key={axis.id}
            href={axis.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:bg-stone-100 hover:text-foreground"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {axis.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function isLeaderAxisPath(pathname: string) {
  return !isTrainingPath(pathname);
}
