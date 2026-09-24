"use client";

import { useId, useState } from "react";

export function CollapsibleSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none sm:px-5"
      >
        <span>
          <span className="block text-base font-semibold text-stone-900">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-sm font-normal text-stone-500">{subtitle}</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-stone-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="border-t border-stone-100">{children}</div>
        </div>
      </div>
    </div>
  );
}
