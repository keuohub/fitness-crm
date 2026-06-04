"use client";

import { COLORS } from "@/lib/design/DESIGN_TOKEN";

// ─── Spinner ───

export function Spinner({ size = 8 }: { size?: number }) {
  return (
    <div
      className="border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
    />
  );
}

// ─── Page Loading ───

export function PageLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size={8} />
    </div>
  );
}

// ─── Skeleton Card ───

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      className="rounded-2xl p-6 space-y-3"
      style={{ boxShadow: "0 2px 12px rgba(62,39,35,0.04)", background: "#fff" }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-full animate-pulse"
          style={{
            width: `${100 - i * 20}%`,
            backgroundColor: "#EDE8E2",
          }}
        />
      ))}
    </div>
  );
}

// ─── Error State ───

export function ErrorState({
  message = "加载失败",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-[#9E8E7E] mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl text-xs font-medium text-white"
          style={{ backgroundColor: COLORS.primary }}
        >
          重试
        </button>
      )}
    </div>
  );
}

// ─── Empty State ───

export function EmptyState({
  title = "暂无数据",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="text-center py-16">
      <div
        className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${COLORS.primary}0a` }}
      >
        <span className="text-lg font-serif" style={{ color: COLORS.primary }}>
          L
        </span>
      </div>
      <p className="text-sm text-[#9E8E7E]">{title}</p>
      {description && (
        <p className="text-xs text-[#9E8E7E] mt-1">{description}</p>
      )}
    </div>
  );
}
