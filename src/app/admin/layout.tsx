import type { Metadata } from "next";
import AdminNavBar from "@/components/admin/AdminNavBar";

export const metadata: Metadata = {
  title: "徕舞 · 管理中心",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F5" }}>
      <AdminNavBar />
      <div>{children}</div>
    </div>
  );
}
