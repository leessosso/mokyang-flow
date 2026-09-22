export function DeploySmokeBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-amber-300/70 bg-amber-50 px-2 py-0.5 text-[11px] font-medium tracking-tight text-amber-900 ${className}`}
    >
      배포 테스트 v0.1
    </span>
  );
}
