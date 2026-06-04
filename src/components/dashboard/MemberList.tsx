"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";

interface Member {
  id: number;
  name: string;
  phone: string | null;
  tags: string | null;
  status: string;
  freezeStatus: string | null;
  stage: string | null;
  freezeEnd?: string | null;
}

interface RecentTraining {
  id: number;
  memberId: number;
  memberName: string;
  trainingDate: string;
  type: string;
  durationMinutes: number | null;
  focusArea: string | null;
}

const FILTERS = [
  { value: "", label: "全部" },
  { value: "active", label: "在籍" },
  { value: "frozen", label: "冻结" },
  { value: "vip", label: "VIP" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#8B5E3C]/10 text-[#8B5E3C]",
  frozen: "bg-[#D4736A]/10 text-[#D4736A]",
  inactive: "bg-[#FAF7F2] text-[#9E8E7E]",
  archived: "bg-[#FAF7F2] text-[#9E8E7E]",
};

const STATUS_LABEL: Record<string, string> = {
  active: "在籍",
  frozen: "冻结",
  inactive: "停课",
  archived: "归档",
};

/** 计算"X天前"文案 */
function daysAgo(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff <= 7) return `${diff}天前`;
  if (diff <= 30) return `${Math.floor(diff / 7)}周前`;
  return `${Math.floor(diff / 30)}月前`;
}

function getLastTraining(memberId: number, recentTrainings?: RecentTraining[]): string | null {
  if (!recentTrainings) return null;
  const found = recentTrainings.find((t) => t.memberId === memberId);
  return found?.trainingDate ?? null;
}

interface Props {
  members: Member[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  loading: boolean;
  onDelete: (m: Member) => void;
  recentTrainings?: RecentTraining[];
}

export default function MemberList({
  members,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  loading,
  onDelete,
  recentTrainings,
}: Props) {
  const filtered = members.filter((m) => {
    const keyword = search.trim().toLowerCase();
    if (keyword) {
      const matchName = m.name.toLowerCase().includes(keyword);
      const matchPhone = m.phone?.includes(keyword) ?? false;
      if (!matchName && !matchPhone) return false;
    }
    if (statusFilter === "vip") {
      const tags = parseTags(m.tags);
      return tags.includes("VIP") || tags.includes("vip");
    }
    if (statusFilter === "frozen") {
      if (m.freezeStatus !== "frozen") return false;
    } else if (statusFilter) {
      if (m.status !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div>
      {/* 搜索 + 筛选 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="搜索会员..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20 rounded-xl"
        />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-200 ${
                active
                  ? "bg-[#8B5E3C] text-white border-[#8B5E3C]"
                  : "bg-white border-[#E8E0D5] text-[#9E8E7E] hover:bg-[#FAF7F2] hover:border-[#8B5E3C]/30"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="h-[76px] rounded-2xl animate-pulse"
              style={{ background: "linear-gradient(90deg, #FAF7F2 0%, #F0EBE5 50%, #FAF7F2 100%)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9E8E7E]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF7F2] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#E8E0D5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-sm">暂无匹配会员</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filtered.map((m, i) => {
              const lastTrainingDate = getLastTraining(m.id, recentTrainings);
              const lastTrainingText = lastTrainingDate ? daysAgo(lastTrainingDate) : null;
              const statusKey = m.freezeStatus === "frozen" ? "frozen" : (m.status || "inactive");
              const tags = parseTags(m.tags);

              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
                >
                  <Link
                    href={`/members/${m.id}`}
                    className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-[#E8E0D5] border-l-[4px] border-l-transparent hover:border-l-[#8B5E3C] hover:bg-[#FDF9F5] hover:shadow-md transition-all duration-200 group"
                  >
                    {/* 左侧圆形头像 */}
                    <div className="w-11 h-11 rounded-full bg-[#8B5E3C]/10 flex items-center justify-center text-[#8B5E3C] font-serif text-base shrink-0 group-hover:scale-105 transition-transform duration-300">
                      {m.name.charAt(0)}
                    </div>

                    {/* 中间：姓名 + 标签 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#3E2723] truncate">
                        {m.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[statusKey]}`}>
                          {m.freezeStatus === "frozen" ? "冻结" : (STATUS_LABEL[m.status] || m.status)}
                        </span>
                        {tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              tag === "VIP" || tag === "vip"
                                ? "bg-[#8B5E3C]/10 text-[#8B5E3C]"
                                : "bg-[#FAF7F2] text-[#9E8E7E]"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {m.phone && (
                          <span className="text-[10px] text-[#9E8E7E] ml-1 hidden sm:inline truncate">
                            {m.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 右侧：最近训练 */}
                    <div className="shrink-0 text-right">
                      {lastTrainingText ? (
                        <>
                          <p className="text-xs font-medium text-[#3E2723]">最近训练</p>
                          <p className="text-[11px] text-[#8B5E3C]">{lastTrainingText}</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-[#9E8E7E]">暂无训练</p>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(m);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9E8E7E] hover:text-[#D4736A] hover:bg-[#D4736A]/10 opacity-0 group-hover:opacity-100 transition-all ml-1"
                      title="删除会员"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [tags];
  }
}
