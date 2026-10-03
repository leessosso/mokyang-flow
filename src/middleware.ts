import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { proxyTongdokRootFlightRequest } from "@/lib/platform/tongdok-flight-proxy";

export default NextAuth(authConfig).auth((request) => {
  const tongdokFlight = proxyTongdokRootFlightRequest(request);
  if (tongdokFlight) {
    return tongdokFlight;
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|favicon.png|manifest.webmanifest|firebase-messaging-sw.js|icons/).*)",
  ],
};
