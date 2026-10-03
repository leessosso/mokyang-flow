import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  TONGDOK_PATH_PREFIX,
  TONGDOK_ROOT_RSC_SEGMENT,
  resolveTongdokOrigin,
  tongdokShellPathToUpstreamPath,
} from "@/lib/platform/tongdok-proxy";

/**
 * 셸 App Router가 `/tongdok` zone 루트 flight로 해석해 307 self-redirect를 내는 URL.
 * next.config `beforeFiles` rewrite보다 먼저 middleware에서 upstream으로 rewrite해야 한다.
 */
export function isTongdokRootFlightProxyPath(pathname: string): boolean {
  return (
    pathname === `${TONGDOK_PATH_PREFIX}.rsc` ||
    pathname === `${TONGDOK_PATH_PREFIX}/${TONGDOK_ROOT_RSC_SEGMENT}`
  );
}

/**
 * 통독 루트 RSC flight를 tongdok-mu로 프록시. 해당 경로가 아니면 null.
 */
export function proxyTongdokRootFlightRequest(
  request: NextRequest,
): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (!isTongdokRootFlightProxyPath(pathname)) {
    return null;
  }

  const origin = resolveTongdokOrigin();
  if (!origin) {
    return null;
  }

  const upstreamPath = tongdokShellPathToUpstreamPath(pathname);
  if (!upstreamPath) {
    return null;
  }

  const target = new URL(upstreamPath, origin);
  target.search = request.nextUrl.search;

  // RSC flight 헤더는 NextResponse.rewrite가 upstream으로 전달한다 (custom fetch 대비).
  return NextResponse.rewrite(target);
}
