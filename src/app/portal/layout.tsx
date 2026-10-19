import type { Metadata } from "next";
import PortalNav from "@/components/portal/PortalNav";
import AuthGuard from "./_components/AuthGuard";

export const metadata: Metadata = {
  title: "徕舞 · 我的成长",
  description: "钟祥徕舞女子塑形 · 会员成长空间",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white text-[#1A1A1A]">
        <main className="px-4 pb-24">{children}</main>
        <PortalNav />
      </div>
    </AuthGuard>
  );
}
