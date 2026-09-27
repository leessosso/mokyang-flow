import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2청년회 운영",
  description: "리더 모임·교안·기도회·배정 모자·가족 보고",
  applicationName: "2청년회 운영",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "2청년회 운영",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex h-full min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
