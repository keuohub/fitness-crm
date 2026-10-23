"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { ToastProvider } from "./Toast";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoginPage = pathname === "/admin/login";

  // 服务端会话校验：退出登录/被停用后，旧 cookie 还能打开页面外壳，
  // 但所有接口都会 401。这里主动确认一次，失效就跳回登录页，避免「看起来还在后台」。
  useEffect(() => {
    if (isLoginPage) return;
    let alive = true;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => {
        if (!r.ok && alive) router.replace("/admin/login");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isLoginPage, pathname, router]);

  // 登录页直接全屏展示，不包含后台导航骨架
  if (isLoginPage) {
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
