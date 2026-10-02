const TONGDOK_APP_URL = "https://tongdok-mu.vercel.app";

const linkClass =
  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100";

/** 통독 앱은 외부 도메인 전체 이동이므로 next/link를 쓰지 않습니다. */
export function PlatformTongdokLink({ className = "" }: { className?: string }) {
  return (
    <a href={TONGDOK_APP_URL} className={`${linkClass} ${className}`}>
      통독으로 가기
    </a>
  );
}
