import type { Metadata } from "next";
import { PortalMemberProvider } from "@/context/PortalMemberContext";
import PortalNav from "@/components/portal/PortalNav";
import UsageTracker from "@/components/portal/UsageTracker";
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
    <PortalMemberProvider>
      <AuthGuard>
        <div className="min-h-screen bg-[#FAF7F2] text-[#3E2723]">
          <UsageTracker />
          <main className="px-5 pb-28">{children}</main>
          <PortalNav />
        </div>
      </AuthGuard>
    </PortalMemberProvider>
  );
}
