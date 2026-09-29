"use client";

function isTrainingPath(pathname: string) {
  return pathname === "/training" || pathname.startsWith("/training/");
}

export function isLeaderAxisPath(pathname: string) {
  return !isTrainingPath(pathname);
}
