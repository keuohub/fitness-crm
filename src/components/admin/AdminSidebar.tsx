"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  CalendarDays,
  BookOpen,
  UserCheck,
  ClipboardCheck,
  Mail,
  BellRing,
  Sparkles,
  Building2,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  BookMarked,
  ShieldCheck,
} from "lucide-react";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // 窄屏（手机）下侧栏改成抽屉：默认移出屏幕，汉堡按钮打开时才滑入。
  // 原来 aside 固定 sticky，汉堡按了只是把整页压暗、侧栏仍占 220px，手机基本不可用。
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 1. 门店工作台核心业务
  const operationsNav = [
    {
      title: "总览数据",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      title: "会员卡",
      href: "/admin/cards",
      icon: CreditCard,
      active: pathname.startsWith("/admin/cards"),
    },
    {
      title: "排课",
      href: "/admin/schedule",
      icon: CalendarDays,
      active: pathname.startsWith("/admin/schedule"),
    },
    {
      title: "课程与教室",
      href: "/admin/courses",
      icon: BookOpen,
      active: pathname.startsWith("/admin/courses"),
    },
    {
      title: "教练课表",
      href: "/admin/coach",
      icon: UserCheck,
      active: pathname.startsWith("/admin/coach"),
    },
    {
      title: "预约管理",
      href: "/admin/bookings",
      icon: ClipboardCheck,
      active: pathname.startsWith("/admin/bookings"),
    },
    {
      title: "待回便签",
      href: "/admin/feelings",
      icon: Mail,
      active: pathname.startsWith("/admin/feelings"),
    },
    {
      title: "跟进名单",
      href: "/admin/followups",
      icon: BellRing,
      active: pathname.startsWith("/admin/followups"),
    },
  ];

  // 2. 小程序内容管理 (1:1 对齐前端 4 个 Tab)
  const cmsNav = [
    {
      title: "1. 徕舞之星",
      href: "/admin/stars",
      icon: Sparkles,
      active: pathname.startsWith("/admin/stars"),
    },
    {
      title: "2. 了解徕舞",
      href: "/admin/brand",
      icon: Building2,
      active:
        pathname.startsWith("/admin/brand") ||
        pathname.startsWith("/admin/venue") ||
        pathname.startsWith("/admin/team") ||
        pathname.startsWith("/admin/offerings"),
    },
    {
      title: "3. 我的蜕变",
      href: "/admin/transformation",
      icon: TrendingUp,
      active: pathname.startsWith("/admin/transformation"),
    },
    {
      title: "4. 我的账户",
      href: "/admin/members",
      icon: Users,
      active: pathname.startsWith("/admin/members"),
    },
  ];

  // 3. 系统与数据工具
  const toolsNav = [
    {
      title: "周期报告",
      href: "/admin/reports",
      icon: FileText,
      active: pathname.startsWith("/admin/reports"),
    },
    {
      title: "飞书同步",
      href: "/admin/sync",
      icon: RefreshCw,
      active:
        pathname.startsWith("/admin/sync") ||
        pathname.startsWith("/admin/sync-status") ||
        pathname.startsWith("/admin/usage"),
    },
    {
      title: "案例库",
      href: "/admin/stories",
      icon: BookMarked,
      active: pathname.startsWith("/admin/stories"),
    },
    {
      title: "账号与权限",
      href: "/admin/settings/users",
      icon: ShieldCheck,
      active: pathname.startsWith("/admin/settings"),
    },
  ];

  const sidebarWidth = collapsed ? 64 : 220;

  const renderNavGroup = (title: string, items: typeof operationsNav) => (
    <div style={{ marginBottom: 20 }}>
      {!collapsed && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#697180",
            padding: "0 14px",
            marginBottom: 6,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
      )}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.title : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "9px 0" : "8px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#2563EB" : "#292D35",
                background: isActive ? "#E8EEFF" : "transparent",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "#F5F7FA";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon
                size={17}
                style={{
                  color: isActive ? "#2563EB" : "#697180",
                  flexShrink: 0,
                }}
              />
              {!collapsed && (
                <span style={{ whiteSpace: "nowrap" }}>{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* 窄屏遮罩层 */}
      {isNarrow && mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(41, 45, 53, 0.4)",
            zIndex: 90,
          }}
        />
      )}

      {/* 侧边栏本体 */}
      <aside
        style={{
          width: sidebarWidth,
          background: "#FFFFFF",
          borderRight: "1px solid #E1E5EB",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
          position: isNarrow ? "fixed" : "sticky",
          top: 56,
          left: isNarrow ? 0 : undefined,
          height: "calc(100vh - 56px)",
          transform: isNarrow
            ? mobileOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : undefined,
          boxShadow: isNarrow && mobileOpen ? "0 8px 32px rgba(0,0,0,0.18)" : undefined,
          padding: "16px 8px",
          transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 95,
        }}
      >
        <div style={{ overflowY: "auto", overflowX: "hidden" }}>
          {renderNavGroup("门店工作台", operationsNav)}
          {renderNavGroup("小程序内容管理", cmsNav)}
          {renderNavGroup("系统与数据工具", toolsNav)}
        </div>

        {/* 底部折叠切换按钮 */}
        <div
          style={{
            borderTop: "1px solid #E1E5EB",
            paddingTop: 10,
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#F5F7FA",
              border: "1px solid #E1E5EB",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: "#697180",
              cursor: "pointer",
            }}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span>收起</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
