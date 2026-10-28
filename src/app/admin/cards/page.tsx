"use client";

import Link from "next/link";
import { addCalendarDays, shanghaiToday } from "@/lib/shanghai-date";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  Plus,
  Search,
  Snowflake,
  Play,
  X,
  Layers,
  ArrowRight,
  Pencil,
  Power,
  Copy,
  Trash2,
  Check,
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

type CourseCategory = {
  id: number;
  key: string;
  name: string;
  duration_minutes: number;
  default_capacity: number;
  color: string | null;
  sort_order: number;
  is_active: number;
};

// 原有 5 个课种的配色保持不变；后续新增课种按调色板循环兜底取色
const KNOWN_COURSE_COLORS: Record<string, string> = {
  pilates: "bg-blue-50 text-blue-700 border-blue-200",
  equipment: "bg-purple-50 text-purple-700 border-purple-200",
  fat_burn: "bg-pink-50 text-pink-700 border-pink-200",
  private: "bg-amber-50 text-amber-700 border-amber-200",
  yoga: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const COURSE_COLOR_PALETTE = [
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-cyan-50 text-cyan-700 border-cyan-200",
  "bg-lime-50 text-lime-700 border-lime-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
];

const courseColor = (cat: CourseCategory, index: number) =>
  KNOWN_COURSE_COLORS[cat.key] || COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length];

type TypeForm = {
  name: string;
  category: string;
  priceYuan: string;
  totalCount: string;
  validityDays: string;
  weeklyLimit: string;
  courseCategoryIds: number[];
};

const emptyTypeForm: TypeForm = {
  name: "",
  category: "count",
  priceYuan: "",
  totalCount: "",
  validityDays: "",
  weeklyLimit: "",
  courseCategoryIds: [],
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "操作失败");

// 课种标签展示（已停用课种灰显并标注）
function CourseTags({
  ids,
  courses,
  emptyText,
}: {
  ids: number[] | undefined;
  courses: CourseCategory[];
  emptyText: string;
}) {
  if (!ids || ids.length === 0) {
    return <span className="text-[11px] text-amber-600">{emptyText}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((cid) => {
        const idx = courses.findIndex((c) => c.id === cid);
        const cat = idx >= 0 ? courses[idx] : null;
        if (!cat) {
          return (
            <span
              key={cid}
              className="px-1.5 py-0.5 rounded text-[11px] font-medium border bg-gray-100 text-gray-500 border-gray-300"
            >
              课种 #{cid}
            </span>
          );
        }
        return (
          <span
            key={cid}
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${
              cat.is_active ? courseColor(cat, idx) : "bg-gray-100 text-gray-500 border-gray-300"
            }`}
          >
            {cat.name}
            {!cat.is_active && <span className="ml-1">已停用</span>}
          </span>
        );
      })}
    </span>
  );
}

type Member = { id: number; name: string; phone: string | null; status: string };

type MemberCard = {
  id: number;
  member_id: number;
  card_type_id: number;
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
  const [courses, setCourses] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Drawers
  const [showIssueDrawer, setShowIssueDrawer] = useState(false);
  const [showTypeDrawer, setShowTypeDrawer] = useState(false);

  // Forms
  const [newType, setNewType] = useState<TypeForm>(emptyTypeForm);

  // 快捷录入新会员
  const [showQuickAddMember, setShowQuickAddMember] = useState(false);
  const [quickMember, setQuickMember] = useState({ name: "", phone: "" });
  const [savingQuickMember, setSavingQuickMember] = useState(false);

  const handleQuickAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMember.name.trim()) {
      showToast("请填写会员姓名", "error");
      return;
    }
    setSavingQuickMember(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: quickMember.name.trim(), phone: quickMember.phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "录入会员失败");
      await load();
      setIssue((prev) => ({ ...prev, memberId: String(data.id) }));
      setQuickMember({ name: "", phone: "" });
      setShowQuickAddMember(false);
      showToast(`会员 ${data.name} 录入成功，已为您直接选定`, "success");
    } catch (err: any) {
      showToast(err.message || "录入会员失败", "error");
    } finally {
      setSavingQuickMember(false);
    }
  };

  // 卡种编辑 / 复制权限 / 删除
  const [editing, setEditing] = useState<(TypeForm & { id: number }) | null>(null);
  const [copySource, setCopySource] = useState<CardType | null>(null);
  const [copyTargetIds, setCopyTargetIds] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<CardType | null>(null);

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

  // 各卡种当前被会员卡引用的数量（用于编辑限制 / 删除确认提示）
  const usageByType = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of cards) {
      const id = Number(c.card_type_id);
      if (!id) continue;
      map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
  }, [cards]);

  const usageOf = (cardTypeId: number) => usageByType.get(cardTypeId) || 0;

  const typePayload = (t: CardType) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    priceCents: t.priceCents,
    totalCount: t.totalCount,
    validityDays: t.validityDays,
    weeklyLimit: t.weeklyLimit,
    isActive: t.isActive,
    courseCategoryIds: t.courseCategoryIds || [],
  });

  const putType = async (body: Record<string, unknown>) =>
    jsonFetch("/api/admin/card-types", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const load = async () => {
    try {
      setLoading(true);
      const [t, m, c, cs] = await Promise.all([
        jsonFetch("/api/admin/card-types"),
        jsonFetch("/api/members"),
        jsonFetch("/api/admin/member-cards"),
        jsonFetch("/api/admin/courses"),
      ]);
      setTypes(t);
      setMembers(m.filter((x: Member) => x.status !== "archived"));
      setCards(c);
      setCourses(
        (Array.isArray(cs) ? cs : []).slice().sort((a: CourseCategory, b: CourseCategory) => {
          const bySort = Number(a.sort_order || 0) - Number(b.sort_order || 0);
          return bySort !== 0 ? bySort : a.id - b.id;
        })
      );
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
    const today = shanghaiToday();
    let validUntil = "";
    if (selected.validityDays) {
      validUntil = addCalendarDays(today, selected.validityDays);
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
        const base = prev.validFrom && /^\d{4}-\d{2}-\d{2}$/.test(prev.validFrom) ? prev.validFrom : shanghaiToday();
        validUntil = addCalendarDays(base, days);
      }
      return { ...prev, validityDays: daysStr, validUntil };
    });
  };

  const handleValidFromChange = (fromStr: string) => {
    setIssue((prev) => {
      let validUntil = prev.validUntil;
      const days = parseInt(prev.validityDays, 10);
      if (!isNaN(days) && days > 0 && /^\d{4}-\d{2}-\d{2}$/.test(fromStr)) {
        validUntil = addCalendarDays(fromStr, days);
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
      await putType({ ...typePayload(t), courseCategoryIds: nextIds });
      await load();
      showToast("课程权限已同步更新", "success");
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
      setNewType(emptyTypeForm);
      await load();
      showToast("新卡种已成功创建", "success");
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  // 打开编辑弹层：把现有卡种字段回填成表单
  const openEdit = (t: CardType) => {
    setEditing({
      id: t.id,
      name: t.name,
      category: t.category,
      priceYuan: t.priceCents != null ? String(t.priceCents / 100) : "",
      totalCount: t.totalCount != null ? String(t.totalCount) : "",
      validityDays: t.validityDays != null ? String(t.validityDays) : "",
      weeklyLimit: t.weeklyLimit != null ? String(t.weeklyLimit) : "",
      courseCategoryIds: t.courseCategoryIds || [],
    });
  };

  const patchEditing = (patch: Partial<TypeForm>) =>
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));

  const toggleEditCourse = (courseId: number) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const has = prev.courseCategoryIds.includes(courseId);
      return {
        ...prev,
        courseCategoryIds: has
          ? prev.courseCategoryIds.filter((x) => x !== courseId)
          : [...prev.courseCategoryIds, courseId],
      };
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) {
      showToast("请输入卡名称", "error");
      return;
    }
    if (editing.category === "count" && !editing.totalCount.trim()) {
      showToast("次数卡必须填写总次数", "error");
      return;
    }
    if (editing.category === "period" && !editing.validityDays.trim()) {
      showToast("期限卡必须填写有效天数", "error");
      return;
    }
    if (editing.courseCategoryIds.length === 0) {
      showToast("卡种至少需保留一种课程权限", "error");
      return;
    }
    setSaving(true);
    try {
      await putType({
        id: editing.id,
        name: editing.name.trim(),
        category: editing.category,
        priceCents: Math.round(Number(editing.priceYuan || 0) * 100),
        totalCount: editing.category === "count" ? Number(editing.totalCount) : null,
        validityDays: editing.validityDays.trim() ? Number(editing.validityDays) : null,
        weeklyLimit: editing.weeklyLimit.trim() ? Number(editing.weeklyLimit) : null,
        courseCategoryIds: editing.courseCategoryIds,
      });
      const savedName = editing.name.trim();
      setEditing(null);
      await load();
      showToast(`卡种「${savedName}」已保存`, "success");
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleTypeActive = async (t: CardType) => {
    const nextActive = t.isActive ? 0 : 1;
    try {
      await putType({ id: t.id, isActive: nextActive });
      await load();
      showToast(`卡种「${t.name}」已${nextActive ? "启用" : "停用"}`, "success");
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await jsonFetch(`/api/admin/card-types?id=${deleteTarget.id}`, { method: "DELETE" });
      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      await load();
      showToast(`卡种「${deletedName}」已删除`, "success");
    } catch (e: unknown) {
      setDeleteTarget(null);
      showToast(errMsg(e), "error");
    } finally {
      setSaving(false);
    }
  };

  // 复制权限：把源卡种的课种权限整体覆盖到勾选的目标卡种
  const runCopy = async () => {
    if (!copySource) return;
    if (copyTargetIds.length === 0) {
      showToast("请至少勾选一个目标卡种", "error");
      return;
    }
    const sourceCourseIds = copySource.courseCategoryIds || [];
    if (sourceCourseIds.length === 0) {
      showToast("源卡种尚未配置课程权限，无法复制", "error");
      return;
    }
    setSaving(true);
    try {
      for (const id of copyTargetIds) {
        const target = types.find((x) => x.id === id);
        if (!target) continue;
        await putType({
          ...typePayload(target),
          courseCategoryIds: sourceCourseIds,
        });
      }
      const count = copyTargetIds.length;
      const sourceName = copySource.name;
      setCopySource(null);
      setCopyTargetIds([]);
      await load();
      showToast(`已将「${sourceName}」的课程权限复制到 ${count} 个卡种`, "success");
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
    } catch (e: unknown) {
      showToast(errMsg(e), "error");
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
          <table className="w-full min-w-[860px] text-left text-sm">
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
                            onClick={() => {
                              setIssue((prev) => ({ ...prev, memberId: String(c.member_id) }));
                              setShowIssueDrawer(true);
                            }}
                            title="为该会员办理另一张新卡或升级新卡项"
                            className="px-2.5 py-1 text-xs font-semibold rounded border bg-blue-50 text-[#2563EB] border-blue-200 hover:bg-blue-100 flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3 h-3" /> 加新卡
                          </button>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#292D35]">
                      1. 选择签约会员 <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddMember(true)}
                      className="text-xs text-[#2563EB] hover:text-blue-700 font-medium flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> 现场录入新会员
                    </button>
                  </div>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="快速搜索姓名、手机或 #LW编号..."
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
                          const idx = courses.findIndex((x) => x.id === cid);
                          const cat = idx >= 0 ? courses[idx] : null;
                          return cat ? (
                            <span
                              key={cid}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                                cat.is_active
                                  ? courseColor(cat, idx)
                                  : "bg-gray-100 text-gray-500 border-gray-300"
                              }`}
                            >
                              {cat.name}
                              {!cat.is_active && <span className="ml-1">已停用</span>}
                            </span>
                          ) : (
                            <span
                              key={cid}
                              className="px-1.5 py-0.5 rounded text-[11px] font-medium border bg-gray-100 text-gray-500 border-gray-300"
                            >
                              课种 #{cid}
                            </span>
                          );
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
                    次数卡直接填次数（如 10、20）；如果是年卡/月卡不限次，总次数与可用次数可直接留空。
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
                  <Link
                    href="/admin/courses"
                    className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline mt-1"
                  >
                    课种不够？去课程与教室添加
                    <ArrowRight className="w-3 h-3" />
                  </Link>
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
                      const used = usageOf(t.id);
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
                              <div className="text-[11px] text-[#697180] mt-0.5">
                                已有 {used} 张会员卡引用
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
                            {courses.length === 0 ? (
                              <div className="text-[11px] text-[#9AA3B2]">
                                未读取到课种，请先到「课程与教室」添加课种。
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {courses.map((cat, idx) => {
                                  const has = curIds.includes(cat.id);
                                  const inactive = !cat.is_active;
                                  const colorCls = inactive
                                    ? "bg-gray-100 text-gray-500 border-gray-300"
                                    : courseColor(cat, idx);
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => toggleTypeCourse(t.id, cat.id, curIds)}
                                      title={
                                        inactive
                                          ? "该课种已停用，仍可配置权限"
                                          : has
                                            ? "点击关闭该课程权限"
                                            : "点击开启该课程权限"
                                      }
                                      className={`px-2 py-0.5 text-[11px] rounded transition-all border inline-flex items-center gap-1 ${
                                        has
                                          ? `${colorCls} font-medium shadow-2xs`
                                          : "bg-white text-gray-400 border-dashed border-gray-200 hover:border-gray-400"
                                      }`}
                                    >
                                      {has ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                      {cat.name}
                                      {inactive && (
                                        <span className="text-[10px] px-1 rounded bg-white border border-gray-200 text-gray-500">
                                          已停用
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Per-type Actions */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-dashed border-[#E1E5EB]">
                            <button
                              type="button"
                              onClick={() => openEdit(t)}
                              className="px-2 py-1 text-[11px] font-medium rounded border bg-white text-[#697180] border-[#E1E5EB] hover:text-[#292D35] hover:bg-[#F5F7FA] inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTypeActive(t)}
                              className={`px-2 py-1 text-[11px] font-medium rounded border inline-flex items-center gap-1 ${
                                t.isActive
                                  ? "bg-white text-[#697180] border-[#E1E5EB] hover:text-[#292D35] hover:bg-[#F5F7FA]"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              {t.isActive ? "停用" : "启用"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCopySource(t);
                                setCopyTargetIds([]);
                              }}
                              className="px-2 py-1 text-[11px] font-medium rounded border bg-white text-[#697180] border-[#E1E5EB] hover:text-[#292D35] hover:bg-[#F5F7FA] inline-flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              复制权限
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(t)}
                              className="px-2 py-1 text-[11px] font-medium rounded border bg-white text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              删除
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {types.length === 0 && (
                      <div className="py-6 text-center text-xs text-[#9AA3B2]">
                        暂无卡种，请在下方新建。
                      </div>
                    )}
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
                    {courses.length === 0 ? (
                      <div className="p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg text-[11px] text-[#9AA3B2]">
                        未读取到课种，请先到「课程与教室」添加课种后再建卡。
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg">
                        {courses.map((cat) => {
                          const checked = newType.courseCategoryIds.includes(cat.id);
                          const inactive = !cat.is_active;
                          return (
                            <label
                              key={cat.id}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer border text-xs transition-colors ${
                                checked
                                  ? "bg-blue-50 border-blue-200 text-blue-900 font-medium"
                                  : "bg-white border-[#E1E5EB] text-[#292D35]"
                              } ${inactive ? "opacity-70" : ""}`}
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
                              <span className="inline-flex items-center gap-1">
                                {cat.name}
                                {inactive && (
                                  <span className="text-[10px] px-1 rounded bg-gray-100 border border-gray-200 text-gray-500">
                                    已停用
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNewType({
                            ...newType,
                            courseCategoryIds: courses.map((c) => c.id),
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

      {/* Modal: Edit Card Type */}
      {editing && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setEditing(null)}
          />
          <div className="relative min-h-full flex items-start sm:items-center justify-center p-4">
            <form
              onSubmit={saveEdit}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E1E5EB] flex flex-col max-h-[88vh]"
            >
              <div className="p-5 border-b border-[#E1E5EB] flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#292D35]">编辑卡种</h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    卡种 #{editing.id} · 保存后开卡下拉与预约权限同步更新。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">
                    卡种名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => patchEditing({ name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">卡片类别</label>
                    <select
                      value={editing.category}
                      onChange={(e) => patchEditing({ category: e.target.value })}
                      disabled={usageOf(editing.id) > 0}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F5F7FA] disabled:text-[#9AA3B2] disabled:cursor-not-allowed"
                    >
                      <option value="count">次数卡</option>
                      <option value="period">期限卡</option>
                    </select>
                    {usageOf(editing.id) > 0 && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        已有 {usageOf(editing.id)} 张会员卡，类别不可修改
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">标准售价（元）</label>
                    <input
                      type="number"
                      value={editing.priceYuan}
                      onChange={(e) => patchEditing({ priceYuan: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {editing.category === "count" ? (
                    <div>
                      <label className="block text-xs font-medium text-[#292D35] mb-1">
                        总次数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={editing.totalCount}
                        onChange={(e) => patchEditing({ totalCount: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-[#292D35] mb-1">
                        有效天数 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={editing.validityDays}
                        onChange={(e) => patchEditing({ validityDays: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[#697180] mb-1">每周限次（可选）</label>
                    <input
                      type="number"
                      placeholder="不限填空"
                      value={editing.weeklyLimit}
                      onChange={(e) => patchEditing({ weeklyLimit: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    适用课程 <span className="text-red-500">*</span>
                    <span className="text-[#697180] font-normal ml-1">（点击开关该卡可预约的课种）</span>
                  </label>
                  {courses.length === 0 ? (
                    <div className="p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg text-[11px] text-[#9AA3B2]">
                      未读取到课种，请先到「课程与教室」添加课种。
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg">
                      {courses.map((cat, idx) => {
                        const has = editing.courseCategoryIds.includes(cat.id);
                        const inactive = !cat.is_active;
                        const colorCls = inactive
                          ? "bg-gray-100 text-gray-500 border-gray-300"
                          : courseColor(cat, idx);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleEditCourse(cat.id)}
                            className={`px-2 py-0.5 text-[11px] rounded transition-all border inline-flex items-center gap-1 ${
                              has
                                ? `${colorCls} font-medium shadow-2xs`
                                : "bg-white text-gray-400 border-dashed border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {has ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {cat.name}
                            {inactive && (
                              <span className="text-[10px] px-1 rounded bg-white border border-gray-200 text-gray-500">
                                已停用
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-sm font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? "正在保存..." : "保存修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Copy Course Permissions */}
      {copySource && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setCopySource(null);
              setCopyTargetIds([]);
            }}
          />
          <div className="relative min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#E1E5EB] flex flex-col max-h-[88vh]">
              <div className="p-5 border-b border-[#E1E5EB] flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#292D35]">复制课程权限</h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    源卡种「{copySource.name}」· 目标卡种的名称、售价、次数保持不变，只覆盖课种权限。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCopySource(null);
                    setCopyTargetIds([]);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <div className="text-[11px] text-[#697180] mb-1">源卡种当前可预约课种：</div>
                  <CourseTags
                    ids={copySource.courseCategoryIds}
                    courses={courses}
                    emptyText="该卡种尚未配置课程权限"
                  />
                </div>

                <div>
                  <div className="text-[11px] text-[#697180] mb-1.5">选择要接收同样课种权限的目标卡种：</div>
                  {types.filter((t) => t.id !== copySource.id).length === 0 ? (
                    <div className="p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg text-[11px] text-[#9AA3B2]">
                      暂无其他卡种可复制。
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {types
                        .filter((t) => t.id !== copySource.id)
                        .map((t) => {
                          const checked = copyTargetIds.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                checked
                                  ? "bg-blue-50 border-blue-200"
                                  : "bg-white border-[#E1E5EB] hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setCopyTargetIds((prev) =>
                                    e.target.checked
                                      ? [...prev, t.id]
                                      : prev.filter((x) => x !== t.id)
                                  );
                                }}
                                className="mt-0.5 rounded border-[#E1E5EB] text-[#2563EB] focus:ring-[#2563EB]"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-1.5">
                                  <span className="font-medium text-[#292D35]">{t.name}</span>
                                  <span className="text-[10px] text-[#697180] bg-[#F0F2F6] px-1 py-0.5 rounded">
                                    #{t.id}
                                  </span>
                                  {!t.isActive && <span className="text-[10px] text-[#9AA3B2]">已停用</span>}
                                </span>
                                <span className="block mt-1">
                                  <CourseTags
                                    ids={t.courseCategoryIds}
                                    courses={courses}
                                    emptyText="当前未配置课程权限"
                                  />
                                </span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCopySource(null);
                    setCopyTargetIds([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={runCopy}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? "正在复制..." : `确认复制（${copyTargetIds.length}）`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Card Type */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-[#E1E5EB]">
              <div className="p-5 border-b border-[#E1E5EB] flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#292D35]">删除卡种</h3>
                  <p className="text-xs text-[#697180] mt-0.5">删除后不可恢复。</p>
                </div>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-2 text-xs text-[#292D35] leading-relaxed">
                <p>
                  确定删除卡种「<span className="font-semibold">{deleteTarget.name}</span>」（#
                  {deleteTarget.id}）吗？
                </p>
                <p className="text-[#697180]">
                  当前有 {usageOf(deleteTarget.id)} 张会员卡引用该卡种；若仍有会员卡在用，系统会拒绝删除并提示改用停用。
                </p>
              </div>
              <div className="p-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? "正在删除..." : "确认删除"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Quick Add Member */}
      {showQuickAddMember && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-[#E1E5EB]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#292D35]">现场录入新会员</h3>
                <p className="text-xs text-[#697180] mt-1">录入后将自动为您选定，直接继续办卡流程。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddMember(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddMember} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">
                  会员姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：王小萌"
                  value={quickMember.name}
                  onChange={(e) => setQuickMember({ ...quickMember, name: e.target.value })}
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">手机号码（可选）</label>
                <input
                  type="tel"
                  placeholder="用于短信与小程序登录匹配"
                  value={quickMember.phone}
                  onChange={(e) => setQuickMember({ ...quickMember, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EB] mt-4">
                <button
                  type="button"
                  onClick={() => setShowQuickAddMember(false)}
                  className="px-3.5 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg hover:bg-[#F5F7FA]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingQuickMember}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {savingQuickMember ? "录入中..." : "确认录入并开卡"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
