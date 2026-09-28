"use client";

import { usePathname } from "next/navigation";
import { isLeaderAxisPath } from "@/components/platform-primary-nav";

export function LeaderAxisChrome({ leaderNav }: { leaderNav: React.ReactNode }) {
  const pathname = usePathname();
  if (!isLeaderAxisPath(pathname)) {
    return null;
  }
  return leaderNav;
}
