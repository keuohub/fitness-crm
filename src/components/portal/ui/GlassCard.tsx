"use client";

import { motion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
  onClick?: () => void;
};

const paddings = { sm: "p-4", md: "p-6", lg: "p-8" };

export default function GlassCard({ children, className = "", hover = true, padding = "md", onClick }: Props) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.15 }}
      className={`rounded-3xl ${paddings[padding]} ${className} ${onClick ? "cursor-pointer select-none" : ""}`}
      style={{
        background: "linear-gradient(135deg, #FDF9F5 0%, rgba(255,255,255,0.95) 100%)",
        boxShadow: "0 2px 16px rgba(62,39,35,0.05)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
