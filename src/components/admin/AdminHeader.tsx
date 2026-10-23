"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, LogOut, CheckCircle2, AlertCircle, Menu, X, User } from "lucide-react";

interface MemberQuickItem {
  id: number;
  name: string;
  memberCode: string | null;
  phone: string | null;
  status: string;
}

export default function AdminHeader({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const router = useRouter();

  // 1. 全局会员搜索状态
  const [members, setMembers] = useState<MemberQuickItem[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // 2. 真实服务健康状态
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // 异步加载会员轻量字典用于秒级检索
    fetch("/api/members")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) {
          setMembers(
            d.map((m: any) => ({
              id: m.id,
              name: m.name,
              memberCode: m.memberCode || `LW${String(m.id).padStart(3, "0")}`,
              phone: m.phone,
              status: m.status,
            }))
          );
        }
      })
      .catch(() => {});

    // 检查服务健康度
    fetch("/api/health")
      .then((r) => r.ok)
      .then((ok) => setIsHealthy(ok))
      .catch(() => setIsHealthy(false));
  }, []);

  // 点击外侧关闭下拉
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 快捷匹配结果
  const searchResults = query.trim()
    ? members
        .filter((m) => {
          const q = query.trim().toLowerCase();
          const code = (m.memberCode || "").toLowerCase();
          const name = (m.name || "").toLowerCase();
          const phone = (m.phone || "").toLowerCase();
          return code.includes(q) || name.includes(q) || phone.includes(q);
        })
        .slice(0, 8)
    : [];

  const handleLogout = async () => {
    try {
      // 必须调后台自己的 logout：DELETE /api/admin/login 会吊销 admin_sessions 并清 admin_session/admin_token。
      // 原来调 /api/portal/logout 只清会员 cookie，点完「退出」回 /admin 仍是登录态。
      await fetch("/api/admin/login", { method: "DELETE" });
    } catch {}
    router.push("/admin/login");
  };

  return (
    <>
      {/* 窄屏适配：390/768 下品牌文字会被压成竖排、退出按钮被挤出视口（原无 nowrap/无断点）。
          这里用媒体查询收窄：900 以下隐藏副标题与搜索框，480 以下只留图标。 */}
      <style>{`
        .admin-header-brand, .admin-header-brand-text { white-space: nowrap; flex-shrink: 0; }
        .admin-header-search { min-width: 0; }
        @media (max-width: 900px) {
          .admin-header-brand-subtitle { display: none; }
          .admin-header-search { display: none; }
          .admin-header-actions { gap: 10px !important; }
        }
        @media (max-width: 480px) {
          .admin-header-health-text, .admin-header-account-name { display: none; }
          .admin-header { padding: 0 12px !important; }
        }
      `}</style>
      <header
        className="admin-header"
        style={{
          height: 56,
          background: "#FFFFFF",
          borderBottom: "1px solid #E1E5EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
      {/* 左侧：菜单开关 (窄屏可见) + 品牌标识 */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="展开或收起导航菜单"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#292D35",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <Link
          href="/admin"
          className="admin-header-brand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "#2563EB",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            LW
          </div>
          <div className="admin-header-brand-text" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                color: "#292D35",
                letterSpacing: 0.5,
              }}
            >
              LAIWU
            </span>
            <span
              className="admin-header-brand-subtitle"
              style={{
                fontSize: 12,
                color: "#697180",
                fontWeight: 400,
              }}
            >
              徕舞女子塑形 · 管理后台
            </span>
          </div>
        </Link>
      </div>

      {/* 中间：全局会员搜索栏 (支持会员编号与姓名) */}
      <div
        ref={searchRef}
        className="admin-header-search"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          margin: "0 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#F5F7FA",
            border: isOpen ? "1px solid #2563EB" : "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "0 12px",
            height: 36,
            transition: "border-color 0.15s ease",
          }}
        >
          <Search size={15} style={{ color: "#697180", marginRight: 8, flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="搜索会员编号（如 LW001 / 089）或姓名..."
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 13,
              color: "#292D35",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#697180",
                padding: 2,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 搜索结果下拉列表 */}
        {isOpen && query.trim() && (
          <div
            style={{
              position: "absolute",
              top: 42,
              left: 0,
              right: 0,
              background: "#FFFFFF",
              borderRadius: 8,
              border: "1px solid #E1E5EB",
              boxShadow: "0 8px 24px rgba(41, 45, 53, 0.08)",
              overflow: "hidden",
              zIndex: 100,
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "#697180",
                background: "#F5F7FA",
                borderBottom: "1px solid #E1E5EB",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>匹配会员 ({searchResults.length})</span>
              <span>支持编号、姓名、手机尾号</span>
            </div>

            {searchResults.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 13, color: "#697180" }}>
                未找到匹配 &quot;{query}&quot; 的在籍会员
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {searchResults.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #F5F7FA",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F7FA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 600,
                          color: "#2563EB",
                          background: "#E8EEFF",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {m.memberCode}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#292D35" }}>
                        {m.name}
                      </span>
                      {m.phone && (
                        <span style={{ fontSize: 12, color: "#697180" }}>
                          ({m.phone})
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/admin/members?q=${encodeURIComponent(m.name)}`);
                        }}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "#E8EEFF",
                          color: "#2563EB",
                          border: "none",
                          fontSize: 11.5,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        档案
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/admin/cards?memberId=${m.id}`);
                        }}
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "#F5F7FA",
                          border: "1px solid #E1E5EB",
                          color: "#292D35",
                          fontSize: 11.5,
                          cursor: "pointer",
                        }}
                      >
                        卡项
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 右侧：服务健康状态 + 账号与退出 */}
      <div className="admin-header-actions" style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {/* 真实服务状态 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            color: isHealthy === false ? "#EF4444" : "#10B981",
            background: isHealthy === false ? "#FEF2F2" : "#ECFDF5",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          {isHealthy === false ? (
            <>
              <AlertCircle size={13} />
              <span className="admin-header-health-text">服务异常</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} />
              <span className="admin-header-health-text">服务正常</span>
            </>
          )}
        </div>

        {/* 当前登录账号 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: "#697180",
          }}
        >
          <User size={14} style={{ color: "#697180" }} />
          <span className="admin-header-account-name">admin</span>
        </div>

        {/* 退出按钮 */}
        <button
          type="button"
          onClick={handleLogout}
          title="退出登录"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 10px",
            background: "#F5F7FA",
            border: "1px solid #E1E5EB",
            borderRadius: 6,
            fontSize: 12,
            color: "#697180",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#E8EAF0";
            e.currentTarget.style.color = "#292D35";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#F5F7FA";
            e.currentTarget.style.color = "#697180";
          }}
        >
          <LogOut size={13} />
          <span>退出</span>
        </button>
      </div>
      </header>
    </>
  );
}
