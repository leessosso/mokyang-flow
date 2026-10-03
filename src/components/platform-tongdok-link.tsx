import { TONGDOK_PATH_PREFIX } from "@/lib/platform/tongdok-proxy";

const linkClass =
  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100";

/** 통독은 same-domain rewrite 경로로 전체 이동하므로 next/link를 쓰지 않습니다. */
export function PlatformTongdokLink({ className = "" }: { className?: string }) {
  return (
    <a href={TONGDOK_PATH_PREFIX} className={`${linkClass} ${className}`}>
      통독으로 가기
    </a>
  );
}
