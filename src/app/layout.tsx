import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";
import PageTransition from "@/components/layout/PageTransition";

export const metadata: Metadata = {
  title: "徕舞成长系统",
  description: "女性成长与身体管理平台 — 普拉提 · 瑜伽 · 塑形 · 体态纠正 · 产后修复 · 女性长期健康训练",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "徕舞成长",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B5E3C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="font-sans">
      <body className="antialiased bg-[#FAF7F2] text-[#3E2723]">
        <Navbar />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
