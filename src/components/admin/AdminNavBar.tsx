"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNavBar() {
  const pathname = usePathname();
  const router = useRouter();

  // If on login page, do not show navigation bar
  if (pathname === "/admin/login") {
    return null;
  }

  const navItems = [
    {
      title: "1. 徕舞之星",
      subtitle: "首屏封面画报",
      href: "/admin/stars",
      active: pathname.startsWith("/admin/stars"),
      icon: "🌟",
    },
    {
      title: "2. 了解徕舞 · 空间",
      subtitle: "场馆光影与器械",
      href: "/admin/venue",
      active: pathname.startsWith("/admin/venue"),
      icon: "🏛️",
    },
    {
      title: "2. 了解徕舞 · 导师",
      subtitle: "主理人与导师阵容",
      href: "/admin/team",
      active: pathname.startsWith("/admin/team"),
      icon: "🧘",
    },
    {
      title: "2. 了解徕舞 · 课程",
      subtitle: "5大类目文字与重点",
      href: "/admin/offerings",
      active: pathname.startsWith("/admin/offerings"),
      icon: "✨",
    },
    {
      title: "3. 我的蜕变",
      subtitle: "体态对比档案与目标",
      href: "/admin/transformation",
      active: pathname.startsWith("/admin/transformation"),
      icon: "👤",
    },
    {
      title: "4. 我的账户",
      subtitle: "会员档案与手札",
      href: "/admin/members",
      active: pathname.startsWith("/admin/members"),
      icon: "💬",
    },
    {
      title: "总览数据",
      subtitle: "运营与关怀",
      href: "/admin",
      active: pathname === "/admin",
      icon: "📊",
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/portal/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #EBE4DF",
        boxShadow: "0 2px 12px rgba(14, 13, 16, 0.04)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 68,
        }}
      >
        {/* Brand Logo & Studio title */}
        <Link
          href="/admin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "#0E0D10",
              color: "#F6E6DA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "serif",
              letterSpacing: 1,
            }}
          >
            LW
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1415", letterSpacing: 0.5 }}>
              徕舞 LAIWU
            </div>
            <div style={{ fontSize: 11, color: "#8C827B", letterSpacing: 0.3 }}>
              小程序统一管理后台
            </div>
          </div>
        </Link>

        {/* 4 Main Tabs corresponding to 4 Mini-program tabs */}
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {navItems.map((item) => {
            const isActive = item.active;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "6px 14px",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  background: isActive ? "#0E0D10" : "transparent",
                  color: isActive ? "#FFFFFF" : "#4A403E",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 12 }}>{item.icon}</span>
                  <span>{item.title}</span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? "rgba(255, 255, 255, 0.7)" : "#9E948E",
                    marginTop: 1,
                  }}
                >
                  {item.subtitle}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Right action group */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 11,
              color: "#2E7D32",
              background: "rgba(46, 125, 50, 0.08)",
              padding: "4px 8px",
              borderRadius: 6,
              fontWeight: 500,
            }}
          >
            ● 服务运行中
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 14px",
              background: "#FAF7F5",
              border: "1px solid #E2D9D2",
              borderRadius: 6,
              fontSize: 12,
              color: "#6D645D",
              cursor: "pointer",
            }}
          >
            退出
          </button>
        </div>
      </div>
    </header>
  );
}
