"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, MessageCircle, User } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/portal",      label: "首页", Icon: Home },
  { href: "/portal/growth",   label: "我的旅程", Icon: Sprout },
  { href: "/portal/feedback", label: "本月回顾", Icon: MessageCircle },
  { href: "/portal/me",       label: "我的", Icon: User },
] as const;

export default function PortalNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl"
      style={{
        background: "rgba(255,255,255,0.78)",
        boxShadow: "0 -2px 20px rgba(62,39,35,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] transition-colors"
              style={{ color: active ? "#8B5E3C" : "#9E8E7E" }}
            >
              {active && (
                <motion.div
                  layoutId="portal-nav-indicator"
                  className="absolute inset-0 rounded-2xl"
                  style={{ backgroundColor: "rgba(139,94,60,0.08)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} className="relative z-10" />
              <span className="text-[10px] font-medium relative z-10">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
