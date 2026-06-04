"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const isCRMPage = (pathname: string) =>
  pathname.startsWith("/members") || pathname.startsWith("/admin");

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // ─── Brand Nav (/) ───
  if (!isCRMPage(pathname) && pathname !== "/portal/login" && !pathname.startsWith("/portal")) {
    return (
      <header className="sticky top-0 z-50 bg-white/[0.72] backdrop-blur-xl transition-all" style={{ boxShadow: "0 1px 8px rgba(62,39,35,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-serif font-bold text-[#3E2723] tracking-wide">徕舞成长</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-[#9E8E7E]">
            <a href="#about" className="hover:text-[#3E2723] transition-colors">品牌故事</a>
            <a href="#journey" className="hover:text-[#3E2723] transition-colors">成长体系</a>
            <a href="#ecosystem" className="hover:text-[#3E2723] transition-colors">产品</a>
            <a href="#cases" className="hover:text-[#3E2723] transition-colors">会员故事</a>
            <a href="#partner" className="hover:text-[#3E2723] transition-colors">合作伙伴</a>
            <a href="#demo" className="hover:text-[#3E2723] transition-colors">预约体验</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/portal" className="text-xs font-medium text-[#9E8E7E] hover:text-[#3E2723] transition-colors">会员入口</Link>
          </div>
        </div>
      </header>
    );
  }

  // ─── CRM Nav (仅 CRM 页面可见) ───
  const navLinks = [
    { key: "dashboard", href: "/admin", label: "首页" },
    { key: "members",   href: "/members", label: "会员管理" },
    { key: "feishu",    href: "/admin/sync", label: "飞书同步" },
    { key: "usage",     href: "/admin/usage", label: "运营数据" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl" style={{ boxShadow: "0 1px 3px rgba(62,39,35,0.04)" }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-serif font-bold text-[#3E2723] tracking-wide">徕舞成长</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.key}
                href={link.href}
                className="relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{ color: active ? "#8B5E3C" : "#9E8E7E" }}
              >
                {link.label}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: "rgba(139,94,60,0.08)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          className="md:hidden flex items-center justify-center w-8 h-8"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <div className="space-y-1">
            <span className={`block w-4 h-[1.5px] bg-[#3E2723] transition-transform ${menuOpen ? "rotate-45 translate-y-[3px]" : ""}`} />
            <span className={`block w-4 h-[1.5px] bg-[#3E2723] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-4 h-[1.5px] bg-[#3E2723] transition-transform ${menuOpen ? "-rotate-45 -translate-y-[3px]" : ""}`} />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-white/95 backdrop-blur-xl border-t border-[#E8E0D5]"
          >
            <div className="px-6 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-2.5 text-sm font-medium transition-colors"
                  style={{ color: pathname === link.href ? "#8B5E3C" : "#9E8E7E" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
