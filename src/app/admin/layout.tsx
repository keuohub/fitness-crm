import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "徕舞 · 管理中心",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
