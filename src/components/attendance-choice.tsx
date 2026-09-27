"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@/lib/types";

/** 출석과 온라인은 하나만 켠다. 둘 다 꺼지면 결석이다. */
export function AttendanceChoice({
  name,
  defaultStatus,
}: {
  name: string;
  defaultStatus: AttendanceStatus;
}) {
  const [status, setStatus] = useState<AttendanceStatus>(
    defaultStatus === "present" || defaultStatus === "broadcast" ? defaultStatus : "none",
  );

  return (
    <div className="flex gap-3">
      <input type="hidden" name={name} value={status} />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={status === "present"}
          onChange={(e) => setStatus(e.target.checked ? "present" : "none")}
        />
        출석
      </label>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={status === "broadcast"}
          onChange={(e) => setStatus(e.target.checked ? "broadcast" : "none")}
        />
        온라인
      </label>
    </div>
  );
}
