"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Snowflake,
  Play,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  User,
  ShieldAlert,
} from "lucide-react";

type CardType = {
  id: number;
  name: string;
  category: string;
  priceCents: number;
  totalCount: number | null;
  validityDays: number | null;
  weeklyLimit: number | null;
  isActive: number;
  courseCategoryIds?: number[];
};

const COURSE_CATEGORIES = [
  { id: 1, key: "pilates", name: "精品普拉提", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: 2, key: "equipment", name: "高定大器械", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: 3, key: "fat_burn", name: "维密超模班", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { id: 4, key: "private", name: "私教", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: 5, key: "yoga", name: "瑜伽", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

type Member = { id: number; name: string; phone: string | null; status: string };

type MemberCard = {
  id: number;
  member_id: number;
  member_name: string;
  member_phone: string | null;
  card_name: string;
  category: string;
  status: string;
  total_count: number | null;
  remaining_count: number | null;
  valid_from: string | null;
  valid_until: string | null;
  price_cents: number;
};

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

const money = (cents: number) => (Number(cents || 0) / 100).toFixed(0);

const statusBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active: { label: "有效", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  frozen: { label: "已冻结", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  exhausted: { label: "已用完", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
  expired: { label: "已过期", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
};

export default function AdminCardsPage() {
  const { showToast } = useToast();
  const [types, setTypes] = useState<CardType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Drawers
  const [showIssueDrawer, setShowIssueDrawer] = useState(false);
  const [showTypeDrawer, setShowTypeDrawer] = useState(false);

  // Forms
  const [newType, setNewType] = useState({
    name: "",
    category: "count",
    priceYuan: "",
    totalCount: "",
    validityDays: "",
    weeklyLimit: "",
    courseCategoryIds: [1] as number[],
  });

  const [issue, setIssue] = useState({
    memberId: "",
    cardTypeId: "",
    totalCount: "",
    remainingCount: "",
    validityDays: "",
    validFrom: "",
    validUntil: "",
    priceYuan: "",
  });

  const [memberFilter, setMemberFilter] = useState("");

  const selectedCardType = useMemo(
    () => types.find((t) => String(t.id) === String(issue.cardTypeId)),
    [types, issue.cardTypeId]
  );

  const load = async () => {
    try {
      setLoading(true);
      const [t, m, c] = await Promise.all([
        jsonFetch("/api/admin/card-types"),
        jsonFetch("/api/members"),
        jsonFetch("/api/admin/member-cards"),
      ]);
      setTypes(t);
      setMembers(m.filter((x: Member) => x.status !== "archived"));
      setCards(c);
    } catch (e: any) {
      showToast(e.message || "加载数据失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mid = params.get("memberId");
      if (mid) {
        setIssue((prev) => ({ ...prev, memberId: mid }));
        setShowIssueDrawer(true);
      }
    }
  }, []);

  const handleSelectCardType = (cardTypeId: string) => {
    const selected = types.find((t) => String(t.id) === cardTypeId);
    if (!selected) {
      setIssue((prev) => ({
        ...prev,
        cardTypeId: "",
        totalCount: "",
        remainingCount: "",
        validityDays: "",
        priceYuan: "",
      }));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    let validUntil = "";
    if (selected.validityDays) {
      const d = new Date();
      d.setDate(d.getDate() + selected.validityDays);
      validUntil = d.toISOString().slice(0, 10);
    }
    const tc = selected.totalCount != null ? String(selected.totalCount) : "";
    const vd = selected.validityDays != null ? String(selected.validityDays) : "";
    const py = selected.priceCents != null ? (selected.priceCents / 100).toFixed(0) : "";
    setIssue((prev) => ({
      ...prev,
      cardTypeId,
      totalCount: tc,
      remainingCount: tc,
      validityDays: vd,
      validFrom: prev.validFrom || today,
      validUntil: prev.validUntil || validUntil,
      priceYuan: py,
    }));
  };

  const handleValidityDaysChange = (daysStr: string) => {
    const days = parseInt(daysStr, 10);
    setIssue((prev) => {
      let validUntil = prev.validUntil;
      if (!isNaN(days) && days > 0) {
        const base = prev.validFrom ? new Date(prev.validFrom) : new Date();
        const d = new Date(base);
        d.setDate(d.getDate() + days);
        validUntil = d.toISOString().slice(0, 10);
      }
      return { ...prev, validityDays: daysStr, validUntil };
    });
  };

  const handleValidFromChange = (fromStr: string) => {
    setIssue((prev) => {
      let validUntil = prev.validUntil;
      const days = parseInt(prev.validityDays, 10);
      if (!isNaN(days) && days > 0 && fromStr) {
        const d = new Date(fromStr);
        d.setDate(d.getDate() + days);
        validUntil = d.toISOString().slice(0, 10);
      }
      return { ...prev, validFrom: fromStr, validUntil };
    });
  };

  const toggleTypeCourse = async (cardTypeId: number, courseId: number, currentIds: number[]) => {
    const nextIds = currentIds.includes(courseId)
      ? currentIds.filter((id) => id !== courseId)
      : [...currentIds, courseId];
    if (nextIds.length === 0) {
      showToast("卡种至少需保留一种课程权限", "error");
      return;
    }
    try {
      const t = types.find((x) => x.id === cardTypeId);
      if (!t) return;
      await jsonFetch("/api/admin/card-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cardTypeId,
          name: t.name,
          category: t.category,
          priceCents: t.priceCents,
          totalCount: t.totalCount,
          validityDays: t.validityDays,
          weeklyLimit: t.weeklyLimit,
          isActive: t.isActive,
          courseCategoryIds: nextIds,
        }),
      });
      await load();
      showToast("课程权限已同步更新", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const createType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.name.trim()) {
      showToast("请输入卡名称", "error");
      return;
    }
    if (newType.courseCategoryIds.length === 0) {
      showToast("请至少勾选一种适用课程", "error");
      return;
    }
    setSaving(true);
    try {
      await jsonFetch("/api/admin/card-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newType.name,
          category: newType.category,
          priceCents: Math.round(Number(newType.priceYuan || 0) * 100),
          totalCount: newType.category === "count" ? Number(newType.totalCount || 0) : null,
          validityDays: newType.validityDays ? Number(newType.validityDays) : null,
          weeklyLimit: newType.weeklyLimit ? Number(newType.weeklyLimit) : null,
          courseCategoryIds: newType.courseCategoryIds,
        }),
      });
      setNewType({
        name: "",
        category: "count",
        priceYuan: "",
        totalCount: "",
        validityDays: "",
        weeklyLimit: "",
        courseCategoryIds: [1],
      });
      await load();
      setShowTypeDrawer(false);
      showToast("新卡种已成功创建", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const issueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.memberId || !issue.cardTypeId) {
      showToast("请选择开卡会员和卡类型", "error");
      return;
    }
    setSaving(true);
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: Number(issue.memberId),
          cardTypeId: Number(issue.cardTypeId),
          totalCount: issue.totalCount.trim() !== "" ? Number(issue.totalCount) : null,
          remainingCount: issue.remainingCount.trim() !== "" ? Number(issue.remainingCount) : null,
          validityDays: issue.validityDays.trim() !== "" ? Number(issue.validityDays) : null,
          validFrom: issue.validFrom || undefined,
          validUntil: issue.validUntil || undefined,
          priceCents: issue.priceYuan.trim() !== "" ? Math.round(Number(issue.priceYuan) * 100) : undefined,
          idempotencyKey: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }),
      });
      setIssue({
        memberId: "",
        cardTypeId: "",
        totalCount: "",
        remainingCount: "",
        validityDays: "",
        validFrom: "",
        validUntil: "",
        priceYuan: "",
      });
      await load();
      setShowIssueDrawer(false);
      showToast("开卡成功，会员账户权益已实时同步", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleFreeze = async (card: MemberCard) => {
    const action = card.status === "frozen" ? "unfreeze" : "freeze";
    const label = action === "freeze" ? "冻结" : "解冻";
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCardId: card.id, action }),
      });
      await load();
      showToast(`已${label}该会员卡`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };


  // 临时调次（次卡）：给运营留的手动补救入口，记入卡流水
  const adjustCount = async (card: MemberCard) => {
    const raw = window.prompt(
      `调整「${card.member_name}」的剩余次数\n当前 ${card.remaining_count ?? 0} / ${card.total_count ?? "-"} 次\n\n增加填正数，减少填负数（例：5 或 -2）`,
      ""
    );
    if (raw === null) return;
    const delta = Number(String(raw).trim());
    if (!delta || !Number.isInteger(delta)) {
      showToast("请输入非零整数", "error");
      return;
    }
    const note = window.prompt("调整原因（会记入卡流水，可留空）：", "") ?? "";
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCardId: card.id, action: "adjust", delta, note }),
      });
      await load();
      showToast(`已${delta > 0 ? "增加" : "减少"} ${Math.abs(delta)} 次`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // 延期（期限卡）：从今天与当前截止日中较晚的那天往后加
  const extendCard = async (card: MemberCard) => {
    const raw = window.prompt(
      `延期「${card.member_name}」的 ${card.card_name}\n当前截止 ${card.valid_until || "长期有效"}\n\n延长天数（例：30）`,
      "30"
    );
    if (raw === null) return;
    const days = Number(String(raw).trim());
    if (!Number.isInteger(days) || days <= 0) {
      showToast("请输入正整数天数", "error");
      return;
    }
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCardId: card.id, action: "extend", days }),
      });
      await load();
      showToast(`已延期 ${days} 天`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // 直接指定到期日
  const setExpiry = async (card: MemberCard) => {
    const raw = window.prompt(
      `修改「${card.member_name}」的到期日\n当前 ${card.valid_until || "长期有效"}\n\n格式 YYYY-MM-DD`,
      card.valid_until || ""
    );
    if (raw === null) return;
    const validUntil = String(raw).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
      showToast("请按 YYYY-MM-DD 格式输入", "error");
      return;
    }
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCardId: card.id, action: "setExpiry", validUntil }),
      });
      await load();
      showToast(`到期日已改为 ${validUntil}`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const code = `lw${c.member_id}`.toLowerCase();
      const name = (c.member_name || "").toLowerCase();
      const phone = (c.member_phone || "").toLowerCase();
      const cardName = (c.card_name || "").toLowerCase();
      return code.includes(q) || name.includes(q) || phone.includes(q) || cardName.includes(q);
    });
  }, [cards, searchQuery, statusFilter]);

  // Statistics
  const activeCount = cards.filter((c) => c.status === "active").length;
  const frozenCount = cards.filter((c) => c.status === "frozen").length;
  const countCardCount = cards.filter((c) => c.category === "count" && c.status === "active").length;
  const periodCardCount = cards.filter((c) => c.category === "period" && c.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MEMBERSHIP CARDS · 会员卡与开卡
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">会员卡管理</h1>
          <p className="text-sm text-[#697180] mt-1">
            统一维护场馆卡种体系与会员签约开卡记录，支持实时开卡、冻结及有效期调整。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTypeDrawer(true)}
            className="px-3.5 py-2 text-sm font-medium text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-4 h-4 text-[#697180]" />
            卡类型配置 ({types.length})
          </button>
          <button
            onClick={() => setShowIssueDrawer(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            办理开卡
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">有效会员卡</div>
          <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">{activeCount}</div>
          <div className="text-xs text-[#2563EB] mt-1">正常在约中</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">有效次卡</div>
          <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">{countCardCount}</div>
          <div className="text-xs text-[#697180] mt-1">按节消课</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">有效期限卡</div>
          <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">{periodCardCount}</div>
          <div className="text-xs text-[#697180] mt-1">月卡 / 季卡 / 年卡</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">暂停 / 冻结</div>
          <div className="text-2xl font-bold text-amber-600 mt-1.5 tabular-nums">{frozenCount}</div>
          <div className="text-xs text-[#697180] mt-1">延期冻结中</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[#E1E5EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#F5F7FA] p-1 rounded-lg border border-[#E1E5EB] self-start">
            {[
              { id: "all", label: "全部", count: cards.length },
              { id: "active", label: "有效", count: activeCount },
              { id: "frozen", label: "已冻结", count: frozenCount },
              { id: "exhausted", label: "已用完/过期", count: cards.length - activeCount - frozenCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-white text-[#292D35] shadow-xs font-semibold"
                    : "text-[#697180] hover:text-[#292D35]"
                }`}
              >
                {tab.label}
                <span className="text-[11px] opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#697180]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会员名、编号或卡种..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E1E5EB] text-[#697180] text-xs font-medium">
              <tr>
                <th className="px-5 py-3.5">会员档案</th>
                <th className="px-5 py-3.5">持有卡项</th>
                <th className="px-5 py-3.5">类别</th>
                <th className="px-5 py-3.5">权益余额 / 有效期</th>
                <th className="px-5 py-3.5">状态</th>
                <th className="px-5 py-3.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EB]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#697180] text-sm">
                    正在读取会员卡数据...
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#697180] text-sm">
                    {searchQuery ? "未找到符合搜索条件的会员卡记录" : "暂无开卡记录"}
                  </td>
                </tr>
              ) : (
                filteredCards.map((c) => {
                  const badge = statusBadge[c.status] || {
                    label: c.status,
                    bg: "bg-gray-100",
                    text: "text-gray-600",
                    border: "border-gray-200",
                  };
                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#E8EEFF] text-[#2563EB] font-semibold text-xs flex items-center justify-center shrink-0">
                            {c.member_name ? c.member_name.slice(0, 1) : "学"}
                          </div>
                          <div>
                            <div className="font-medium text-[#292D35] flex items-center gap-1.5">
                              {c.member_name}
                              <span className="font-mono text-[11px] text-[#697180] bg-[#F0F2F6] px-1.5 py-0.5 rounded">
                                #LW{c.member_id}
                              </span>
                            </div>
                            <div className="text-xs text-[#697180] mt-0.5">{c.member_phone || "未留手机号"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-[#292D35]">{c.card_name}</div>
                        <div className="text-xs text-[#697180]">¥{money(c.price_cents)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {c.category === "count" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            次卡
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            期限卡
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.category === "count" ? (
                          <div className="tabular-nums">
                            <span className="font-semibold text-[#292D35] text-base">{c.remaining_count ?? 0}</span>
                            <span className="text-xs text-[#697180] ml-1">/ {c.total_count ?? "-"} 次</span>
                          </div>
                        ) : (
                          <div className="text-xs text-[#292D35]">
                            <div>
                              剩{" "}
                              <span className="tabular-nums font-semibold text-base">
                                {c.valid_until
                                  ? (() => {
                                      const d = Math.ceil(
                                        (new Date(c.valid_until + "T23:59:59").getTime() - Date.now()) / 86400000
                                      );
                                      return d >= 0 ? d : 0;
                                    })()
                                  : "长期"}
                              </span>
                              {c.valid_until ? " 天" : ""}
                            </div>
                            <div className="text-[11px] text-[#697180]">
                              截止: {c.valid_until || "长期有效"} · 起: {c.valid_from || "即日起"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => adjustCount(c)}
                            disabled={c.remaining_count === null}
                            title={c.remaining_count === null ? "不限次卡，请用延期" : "临时加减剩余次数"}
                            className="px-2.5 py-1 text-xs font-medium rounded border bg-white text-[#697180] border-[#E1E5EB] hover:bg-[#F5F7FA] hover:text-[#292D35] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            调次
                          </button>
                          <button
                            onClick={() => extendCard(c)}
                            className="px-2.5 py-1 text-xs font-medium rounded border bg-white text-[#697180] border-[#E1E5EB] hover:bg-[#F5F7FA] hover:text-[#292D35]"
                          >
                            延期
                          </button>
                          <button
                            onClick={() => setExpiry(c)}
                            className="px-2.5 py-1 text-xs font-medium rounded border bg-white text-[#697180] border-[#E1E5EB] hover:bg-[#F5F7FA] hover:text-[#292D35]"
                          >
                            改到期
                          </button>
                          <button
                            onClick={() => toggleFreeze(c)}
                            disabled={c.status !== "frozen" && c.status !== "active"}
                            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${
                              c.status === "frozen"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                : "bg-white text-[#697180] border-[#E1E5EB] hover:bg-[#F5F7FA] hover:text-[#292D35]"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {c.status === "frozen" ? (
                              <>
                                <Play className="w-3 h-3" /> 解冻
                              </>
                            ) : (
                              <>
                                <Snowflake className="w-3 h-3" /> 冻结
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer: Issue Member Card */}
      {showIssueDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setShowIssueDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">办理开卡</h3>
                  <p className="text-xs text-[#697180] mt-0.5">为学员签约开通课时卡或期限卡，开卡后即刻同步小程序端。</p>
                </div>
                <button
                  onClick={() => setShowIssueDrawer(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={issueCard} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Member selection */}
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    1. 选择会员 <span className="text-red-500">*</span>
                  </label>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="🔍 快速搜索姓名、手机或 #LW编号..."
                      value={memberFilter}
                      onChange={(e) => setMemberFilter(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <select
                    value={issue.memberId}
                    onChange={(e) => setIssue({ ...issue, memberId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#292D35]"
                  >
                    <option value="">-- 请选择签约会员 --</option>
                    {members
                      .filter((m) => {
                        if (!memberFilter.trim()) return true;
                        const q = memberFilter.trim().toLowerCase();
                        const code = `lw${m.id}`;
                        const name = (m.name || "").toLowerCase();
                        const phone = (m.phone || "").toLowerCase();
                        return code.includes(q) || name.includes(q) || phone.includes(q);
                      })
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          #LW{m.id} {m.name} ({m.phone || "无号码"})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Card Type selection */}
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    2. 选择卡项与名称 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={issue.cardTypeId}
                    onChange={(e) => handleSelectCardType(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#292D35]"
                  >
                    <option value="">-- 选择要发放的卡种 --</option>
                    {types
                      .filter((t) => t.isActive)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.category === "count" ? `次数卡` : `期限卡`} · 标准¥
                          {money(t.priceCents)}
                        </option>
                      ))}
                  </select>

                  {/* Show selected card details & course badges */}
                  {selectedCardType && (
                    <div className="mt-2.5 p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg">
                      <div className="text-[11px] text-[#697180] mb-1.5 flex items-center justify-between">
                        <span>该卡覆盖可预约课程：</span>
                        <span className="font-medium text-[#2563EB]">
                          {selectedCardType.category === "count" ? "次卡" : "期限卡"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(selectedCardType.courseCategoryIds || []).map((cid) => {
                          const cat = COURSE_CATEGORIES.find((x) => x.id === cid);
                          return cat ? (
                            <span
                              key={cid}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${cat.color}`}
                            >
                              {cat.name}
                            </span>
                          ) : null;
                        })}
                        {(!selectedCardType.courseCategoryIds || selectedCardType.courseCategoryIds.length === 0) && (
                          <span className="text-[11px] text-amber-600">暂未关联课程（请在卡类型配置中勾选）</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Course count configuration */}
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E5EB] space-y-3">
                  <div className="text-xs font-semibold text-[#292D35] flex items-center justify-between">
                    <span>3. 自定义课程次数</span>
                    <span className="text-[11px] font-normal text-[#697180]">不限定固定次数，自由输入</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#697180] mb-1">
                        课程总次数（次）
                      </label>
                      <input
                        type="number"
                        placeholder="留空表示不限次"
                        value={issue.totalCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIssue((prev) => ({
                            ...prev,
                            totalCount: val,
                            remainingCount:
                              prev.remainingCount === "" || prev.remainingCount === prev.totalCount
                                ? val
                                : prev.remainingCount,
                          }));
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#697180] mb-1">
                        初始可用次数（次）
                      </label>
                      <input
                        type="number"
                        placeholder="默认同总次数"
                        value={issue.remainingCount}
                        onChange={(e) => setIssue({ ...issue, remainingCount: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9AA3B2] leading-tight">
                    💡 次数卡直接填次数（如 10、20）；如果是年卡/月卡不限次，总次数与可用次数可直接留空。
                  </p>
                </div>

                {/* Validity days and dates configuration */}
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E5EB] space-y-3">
                  <div className="text-xs font-semibold text-[#292D35] flex items-center justify-between">
                    <span>4. 有效天数与到期日</span>
                    <span className="text-[11px] font-normal text-[#697180]">可填天数或指定日期</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#697180] mb-1">
                      有效天数（天）
                    </label>
                    <input
                      type="number"
                      placeholder="例如 30(月卡)、90(季卡)、365(年卡)"
                      value={issue.validityDays}
                      onChange={(e) => handleValidityDaysChange(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#697180] mb-1">生效起始日</label>
                      <input
                        type="date"
                        value={issue.validFrom}
                        onChange={(e) => handleValidFromChange(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#697180] mb-1">失效到期日</label>
                      <input
                        type="date"
                        value={issue.validUntil}
                        onChange={(e) => setIssue({ ...issue, validUntil: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>

                {/* Price input */}
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">
                    5. 实收金额（元，支持自定义修改）
                  </label>
                  <input
                    type="number"
                    placeholder="实收金额"
                    value={issue.priceYuan}
                    onChange={(e) => setIssue({ ...issue, priceYuan: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#E1E5EB] text-xs text-[#697180] leading-relaxed">
                  提示：留空日期将依照卡种默认规则自动计算有效周期。提交后系统自动完成防重校验与幂等扣记。
                </div>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowIssueDrawer(false)}
                    className="px-4 py-2 text-sm font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {saving ? "正在办理..." : "确认签约开卡"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Card Types Management */}
      {showTypeDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setShowTypeDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">卡类型配置</h3>
                  <p className="text-xs text-[#697180] mt-0.5">设定场馆的标准课时卡种、售价与课程预约权限。</p>
                </div>
                <button
                  onClick={() => setShowTypeDrawer(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Existing Types List */}
                <div>
                  <div className="text-xs font-semibold text-[#697180] uppercase tracking-wider mb-2">
                    现有卡种列表 ({types.length}) · 点击课程标签可直接开关权限
                  </div>
                  <div className="space-y-2.5">
                    {types.map((t) => {
                      const curIds = t.courseCategoryIds || [];
                      return (
                        <div
                          key={t.id}
                          className="p-3 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-[#292D35] flex items-center gap-1.5">
                                <span>{t.name}</span>
                                <span className="text-[10px] text-[#697180] bg-white border border-[#E1E5EB] px-1 py-0.5 rounded">
                                  #{t.id}
                                </span>
                              </div>
                              <div className="text-xs text-[#697180] mt-0.5">
                                {t.category === "count" ? `${t.totalCount ?? "-"} 次` : `${t.validityDays ?? "-"} 天有效期`}
                                {t.weeklyLimit ? ` · 每周限 ${t.weeklyLimit} 次` : ""}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-[#2563EB]">¥{money(t.priceCents)}</div>
                              <div
                                className={`text-[11px] ${
                                  t.isActive ? "text-emerald-600" : "text-[#9AA3B2]"
                                }`}
                              >
                                {t.isActive ? "已启用" : "已停用"}
                              </div>
                            </div>
                          </div>

                          {/* Interactive Course Permission Tags */}
                          <div>
                            <div className="text-[11px] text-[#697180] mb-1">允许预约课种（点击开关）：</div>
                            <div className="flex flex-wrap gap-1.5">
                              {COURSE_CATEGORIES.map((cat) => {
                                const has = curIds.includes(cat.id);
                                return (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleTypeCourse(t.id, cat.id, curIds)}
                                    title={has ? "点击关闭该课程权限" : "点击开启该课程权限"}
                                    className={`px-2 py-0.5 text-[11px] rounded transition-all border ${
                                      has
                                        ? `${cat.color} font-medium shadow-2xs`
                                        : "bg-white text-gray-400 border-dashed border-gray-200 hover:border-gray-400 line-through"
                                    }`}
                                  >
                                    {has ? `✓ ${cat.name}` : `+ ${cat.name}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Create New Type Form */}
                <form onSubmit={createType} className="pt-4 border-t border-[#E1E5EB] space-y-4">
                  <div className="text-xs font-semibold text-[#292D35] uppercase tracking-wider">
                    新增卡类型
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">卡种名称</label>
                    <input
                      type="text"
                      placeholder="例如：普拉提形体私教次卡"
                      value={newType.name}
                      onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                      required
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#292D35] mb-1">卡片类别</label>
                      <select
                        value={newType.category}
                        onChange={(e) => setNewType({ ...newType, category: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      >
                        <option value="count">次数卡</option>
                        <option value="period">期限卡</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#292D35] mb-1">标准售价（元）</label>
                      <input
                        type="number"
                        placeholder="售价"
                        value={newType.priceYuan}
                        onChange={(e) => setNewType({ ...newType, priceYuan: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {newType.category === "count" ? (
                      <div>
                        <label className="block text-xs font-medium text-[#292D35] mb-1">总次数</label>
                        <input
                          type="number"
                          placeholder="例如 10"
                          value={newType.totalCount}
                          onChange={(e) => setNewType({ ...newType, totalCount: e.target.value })}
                          required
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-[#292D35] mb-1">有效天数</label>
                        <input
                          type="number"
                          placeholder="例如 90"
                          value={newType.validityDays}
                          onChange={(e) => setNewType({ ...newType, validityDays: e.target.value })}
                          required
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-[#697180] mb-1">每周限次（可选）</label>
                      <input
                        type="number"
                        placeholder="不限填空"
                        value={newType.weeklyLimit}
                        onChange={(e) => setNewType({ ...newType, weeklyLimit: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  {/* Course Category Permission Multi-select */}
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                      适用课程 <span className="text-red-500">*</span>
                      <span className="text-[#697180] font-normal ml-1">（勾选该卡可以预约的课程，一卡通类卡勾全部）</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg">
                      {COURSE_CATEGORIES.map((cat) => {
                        const checked = newType.courseCategoryIds.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer border text-xs transition-colors ${
                              checked
                                ? "bg-blue-50 border-blue-200 text-blue-900 font-medium"
                                : "bg-white border-[#E1E5EB] text-[#292D35]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewType({
                                    ...newType,
                                    courseCategoryIds: [...newType.courseCategoryIds, cat.id],
                                  });
                                } else {
                                  setNewType({
                                    ...newType,
                                    courseCategoryIds: newType.courseCategoryIds.filter((x) => x !== cat.id),
                                  });
                                }
                              }}
                              className="rounded border-[#E1E5EB] text-[#2563EB] focus:ring-[#2563EB]"
                            />
                            <span>{cat.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNewType({
                            ...newType,
                            courseCategoryIds: COURSE_CATEGORIES.map((c) => c.id),
                          })
                        }
                        className="text-[11px] text-[#2563EB] hover:underline"
                      >
                        一键全选（通卡）
                      </button>
                      <span className="text-[11px] text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setNewType({ ...newType, courseCategoryIds: [] })}
                        className="text-[11px] text-[#697180] hover:underline"
                      >
                        清空
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2 text-xs font-medium text-white bg-[#292D35] hover:bg-black rounded-lg shadow-sm disabled:opacity-50 mt-2"
                  >
                    {saving ? "正在创建..." : "保存新卡种"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
