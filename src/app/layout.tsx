import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "آکادمی شنا", template: "%s | آکادمی شنا" },
  description: "سامانه مدیریت آکادمی شنای نوجوانان و رقابتی",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e6f98" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
