"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Users, CreditCard, Menu } from "lucide-react";

interface AdminMobileNavProps {
  onOpenSidebar: () => void;
}

export default function AdminMobileNav({ onOpenSidebar }: AdminMobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "首页",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      title: "排课",
      href: "/admin/schedule",
      icon: CalendarDays,
      active: pathname.startsWith("/admin/schedule"),
    },
    {
      title: "会员",
      href: "/admin/members",
      icon: Users,
      active: pathname.startsWith("/admin/members"),
    },
    {
      title: "会员卡",
      href: "/admin/cards",
      icon: CreditCard,
      active: pathname.startsWith("/admin/cards"),
    },
  ];

  return (
    <>
      <style>{`
        .admin-mobile-nav {
          display: none;
        }
        @media (max-width: 768px) {
          .admin-mobile-nav {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: calc(56px + env(safe-area-inset-bottom, 0px));
            padding-bottom: env(safe-area-inset-bottom, 0px);
            background: #FFFFFF;
            border-top: 1px solid #E8E5E0;
            z-index: 45;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
            align-items: center;
            justify-content: space-around;
          }
        }
      `}</style>
      <nav className="admin-mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                flex: 1,
                height: 56,
                textDecoration: "none",
                color: isActive ? "#0D0C0F" : "#8C8984",
                fontWeight: isActive ? 600 : 400,
                fontSize: 11,
                transition: "color 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  background: isActive ? "#F6E6DA" : "transparent",
                  color: isActive ? "#9E7B44" : "#8C8984",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} />
              </div>
              <span>{item.title}</span>
            </Link>
          );
        })}

        {/* 更多菜单按钮 (触发侧栏抽屉) */}
        <button
          type="button"
          onClick={onOpenSidebar}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            flex: 1,
            height: 56,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#8C8984",
            fontSize: 11,
          }}
        >
          <div
            style={{
              width: 32,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              color: "#8C8984",
            }}
          >
            <Menu size={18} strokeWidth={1.8} />
          </div>
          <span>更多</span>
        </button>
      </nav>
    </>
  );
}
