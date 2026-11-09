import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { themeInitScript } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "آکادمی شنا", template: "%s | آکادمی شنا" },
  description: "سامانه مدیریت آکادمی شنای نوجوانان و رقابتی",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a73a1" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The middleware issues a per-request CSP nonce; the inline theme script needs it to run.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // data-theme is set before paint by the inline script, so React must not warn about it.
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
