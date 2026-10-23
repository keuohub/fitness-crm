"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { ToastProvider } from "./Toast";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 登录页直接全屏展示，不包含后台导航骨架
  if (pathname === "/admin/login") {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          color: "#292D35",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 全局顶部工具栏 */}
        <AdminHeader onToggleSidebar={() => setMobileOpen((prev) => !prev)} />

        {/* 下方主体：左侧可折叠导航 + 右侧工作区 */}
        <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 56px)" }}>
          <AdminSidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((prev) => !prev)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
          />
          <main
            style={{
              flex: 1,
              minWidth: 0,
              background: "#F5F7FA",
              overflowX: "hidden",
              padding: "28px 32px",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
