"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Sparkles,
  Layers,
  X,
  UserPlus,
  ArrowRight,
  RotateCcw,
  Edit2,
  Building2,
} from "lucide-react";

type Course = {
  id: number;
  name: string;
  duration_minutes: number;
  default_capacity: number;
  is_active?: number;
  category_type?: string;
};
type Coach = { id: number; name: string };
type Room = { id: number; name: string; capacity: number };
type Session = {
  id: number;
  course_category_id: number;
  coach_id: number;
  room_id: number | null;
  title: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  note?: string | null;
  course_name: string;
  coach_name: string;
  room_name: string | null;
  category_type?: string;
};
type Template = {
  id: number;
  course_id: number;
  coach_id: number;
  room_id: number | null;
  weekday: number;
  start_time: string;
  end_time: string;
  capacity: number;
  course_name: string;
  coach_name: string;
  room_name: string | null;
};

async function jf(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}

function fmt(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function mondayOf(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - day);
  return fmt(x);
}
function mondayOfStr(s: string) {
  const [y, m, dd] = s.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return fmt(d);
}
function addDays(s: string, n: number) {
  const [y, m, dd] = s.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function AdminSchedulePage() {
  const { showToast } = useToast();
  const [week, setWeek] = useState(mondayOf(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Drawers & Modals
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showTplDrawer, setShowTplDrawer] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Forms
  const [coachName, setCoachName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [form, setForm] = useState({
    courseCategoryId: "",
    coachId: "",
    roomId: "",
    sessionDate: "",
    startTime: "09:00",
    capacity: "6",
    note: "",
  });
  const [editForm, setEditForm] = useState({
    id: 0,
    courseCategoryId: "",
    coachId: "",
    roomId: "",
    sessionDate: "",
    startTime: "09:00",
    capacity: "6",
    note: "",
  });
  const [tpl, setTpl] = useState({
    courseId: "",
    coachId: "",
    roomId: "",
    weekday: "1",
    startTime: "09:00",
    capacity: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const [s, t, c, u, r] = await Promise.all([
        jf(`/api/admin/schedule?from=${week}&to=${addDays(week, 6)}`),
        jf("/api/admin/schedule/templates"),
        jf("/api/admin/courses"),
        jf("/api/admin/coaches"),
        jf("/api/admin/rooms"),
      ]);
      setSessions(s);
      setTemplates(t);
      setCourses(c);
      setCoaches(u);
      setRooms(r);
    } catch (e: any) {
      showToast(e.message || "加载课表失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [week]);

  // 首次进入时：本周若没有排课（常见于课都排在下周），自动跳到最近有课的那一周，
  // 否则主人打开排课页只看到一片「无排课」，会以为课丢了。
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = fmt(new Date());
        const list = await jf(`/api/admin/schedule?from=${today}&to=${addDays(today, 60)}`);
        if (!alive || !Array.isArray(list) || !list.length) return;
        const inCurrentWeek = list.some((s: any) => s.session_date >= week && s.session_date <= addDays(week, 6));
        if (inCurrentWeek) return;
        const next = list.filter((s: any) => s.session_date >= today).sort((a: any, b: any) => String(a.session_date).localeCompare(String(b.session_date)))[0];
        if (!next) return;
        const targetWeek = mondayOfStr(String(next.session_date));
        if (targetWeek !== week) {
          setWeek(targetWeek);
          showToast(`本周没有排课，已跳到最近有课的一周（${targetWeek} 起）`, "success");
        }
      } catch {
        /* 静默：拿不到就保持当前周 */
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 新建课次/模板的课种下拉只展示启用中的课种；已有课次渲染不受影响（可能仍在用已停用课种）
  const activeCourses = useMemo(() => courses.filter((c) => c.is_active !== 0), [courses]);

  const handleOpenAdd = (date?: string) => {
    const firstCourse = activeCourses[0];
    const defaultCap = firstCourse?.default_capacity
      ? String(firstCourse.default_capacity)
      : firstCourse?.name?.includes("私教")
      ? "1"
      : "6";
    setForm({
      sessionDate: date || fmt(new Date()),
      courseCategoryId: firstCourse?.id ? String(firstCourse.id) : "",
      coachId: coaches[0]?.id ? String(coaches[0].id) : "",
      roomId: rooms[0]?.id ? String(rooms[0].id) : "",
      startTime: "09:00",
      capacity: defaultCap,
      note: "",
    });
    setShowAddDrawer(true);
  };

  const handleOpenEdit = (s: Session) => {
    setEditForm({
      id: s.id,
      courseCategoryId: String(s.course_category_id),
      coachId: String(s.coach_id),
      roomId: s.room_id ? String(s.room_id) : "",
      sessionDate: s.session_date,
      startTime: s.start_time,
      capacity: String(s.capacity || 6),
      note: s.note || "",
    });
    setEditingSession(s);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseCategoryId || !form.coachId || !form.sessionDate || !form.startTime) {
      showToast("请完整填写排课必填信息", "error");
      return;
    }
    setSaving(true);
    try {
      await jf("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? Number(form.capacity) : 6,
        }),
      });
      showToast("课次已成功保存并发布", "success");
      setShowAddDrawer(false);
      await load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const updateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id || !editForm.courseCategoryId || !editForm.coachId || !editForm.sessionDate || !editForm.startTime) {
      showToast("请完整填写排课必填信息", "error");
      return;
    }
    setSaving(true);
    try {
      await jf("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          capacity: editForm.capacity ? Number(editForm.capacity) : 6,
        }),
      });
      showToast("课次与人数容量已成功更新", "success");
      setEditingSession(null);
      await load();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await jf(`/api/admin/schedule?id=${deleteConfirmId}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      if (editingSession?.id === deleteConfirmId) {
        setEditingSession(null);
      }
      await load();
      showToast("课次已成功删除", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const addCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = coachName.trim();
    if (!trimmed) return;
    if (coaches.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast(`教练「${trimmed}」已在教练库中，请勿重复添加`, "error");
      return;
    }
    try {
      const newCoach = await jf("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      setCoachName("");
      if (showAddDrawer) {
        setForm((prev) => ({ ...prev, coachId: String(newCoach.id) }));
      }
      if (editingSession) {
        setEditForm((prev) => ({ ...prev, coachId: String(newCoach.id) }));
      }
      await load();
      showToast(`教练「${newCoach.name}」已添加并选定`, "success");
      setShowCoachModal(false);
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const removeCoach = async (id: number, name: string) => {
    if (!confirm(`确定要移除教练「${name}」的排课身份吗？`)) return;
    try {
      await jf(`/api/admin/coaches?id=${id}`, { method: "DELETE" });
      await load();
      showToast(`教练「${name}」已移除`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = roomName.trim();
    if (!trimmed) return;
    if (rooms.some((r) => r.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      showToast(`场地「${trimmed}」已存在，请勿重复添加`, "error");
      return;
    }
    try {
      const newRoom = await jf("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, capacity: 10 }),
      });
      setRoomName("");
      if (showAddDrawer) {
        setForm((prev) => ({ ...prev, roomId: String(newRoom.id) }));
      }
      if (editingSession) {
        setEditForm((prev) => ({ ...prev, roomId: String(newRoom.id) }));
      }
      await load();
      showToast(`场地「${newRoom.name}」已添加并选定`, "success");
      setShowRoomModal(false);
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const removeRoom = async (id: number, name: string) => {
    if (!confirm(`确定要删除或停用场地「${name}」吗？`)) return;
    try {
      await jf(`/api/admin/rooms?id=${id}`, { method: "DELETE" });
      await load();
      showToast(`场地「${name}」已删除`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const addTpl = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await jf("/api/admin/schedule/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...tpl,
          weekday: Number(tpl.weekday),
          capacity: tpl.capacity ? Number(tpl.capacity) : undefined,
        }),
      });
      await load();
      showToast("模板课次已保存", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const generate = async () => {
    try {
      const r = await jf("/api/admin/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: week }),
      });
      if (r.warnings?.length) setWarnings(r.warnings);
      showToast(`已从模板生成 ${r.created} 节课，跳过 ${r.skipped} 节已有课次`, "success");
      await load();
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const todayStr = useMemo(() => fmt(new Date()), []);

  const filteredSessions = useMemo(() => {
    if (categoryFilter === "all") return sessions;
    return sessions.filter((s) => (s.category_type || "boutique") === categoryFilter);
  }, [sessions, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            WEEKLY SCHEDULE · 周排课工作台
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">周排课表</h1>
          <p className="text-sm text-[#697180] mt-1">
            Google Calendar 式周视图。冲突只提示不拦截，可随时灵活调整教室与教练。
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Week Navigation */}
          <div className="flex items-center bg-white border border-[#E1E5EB] rounded-lg shadow-sm p-1">
            <button
              onClick={() => setWeek(addDays(week, -7))}
              className="p-1.5 hover:bg-[#F5F7FA] rounded text-[#697180] hover:text-[#292D35] transition-colors"
              title="上一周"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-medium text-[#292D35] tabular-nums">
              {week} ~ {addDays(week, 6)}
            </div>
            <button
              onClick={() => setWeek(addDays(week, 7))}
              className="p-1.5 hover:bg-[#F5F7FA] rounded text-[#697180] hover:text-[#292D35] transition-colors"
              title="下一周"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeek(mondayOf(new Date()))}
              className="ml-1 px-2 py-1 text-xs text-[#2563EB] hover:bg-[#E8EEFF] rounded font-medium transition-colors"
            >
              本周
            </button>
          </div>

          <button
            onClick={() => setShowTplDrawer(true)}
            className="px-3 py-2 text-xs font-medium text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-[#697180]" />
            周模板 ({templates.length})
          </button>

          <button
            onClick={generate}
            className="px-3 py-2 text-xs font-medium text-[#2563EB] bg-[#E8EEFF] hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            一键套用模板
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            手动排课
          </button>
        </div>
      </div>

      {/* Category Tabs & Stats Filter (同步小程序三大分栏) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E1E5EB] shadow-2xs">
        <div className="flex items-center gap-1.5 bg-[#F5F7FA] p-1 rounded-lg border border-[#E1E5EB]">
          {[
            { id: "all", label: "全部排课", count: sessions.length },
            {
              id: "boutique",
              label: "精品课 (小班器械)",
              count: sessions.filter((s) => (s.category_type || "boutique") === "boutique").length,
            },
            {
              id: "group",
              label: "团体课 (超模/瑜伽)",
              count: sessions.filter((s) => s.category_type === "group").length,
            },
            {
              id: "private",
              label: "私教课 (1V1)",
              count: sessions.filter((s) => s.category_type === "private").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                categoryFilter === tab.id
                  ? "bg-white text-[#2563EB] shadow-xs font-semibold"
                  : "text-[#697180] hover:text-[#292D35]"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  categoryFilter === tab.id
                    ? "bg-blue-50 text-[#2563EB]"
                    : "bg-gray-100 text-[#697180]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="text-xs text-[#697180]">
          提示：课程分类由课程档案管理，与小程序端“精品课 / 团体课 / 私教课”分栏 100% 实时联动。
        </div>
      </div>

      {/* Calendar Week Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekdays.map((w, i) => {
          const date = addDays(week, i);
          const isToday = date === todayStr;
          const daySessions = filteredSessions
            .filter((s) => s.session_date === date)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div
              key={date}
              className={`flex flex-col bg-white border rounded-xl overflow-hidden shadow-sm min-h-[140px] md:min-h-[500px] transition-all ${
                isToday ? "border-[#2563EB] ring-2 ring-[#2563EB]/15" : "border-[#E1E5EB]"
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-3 border-b flex items-center justify-between ${
                  isToday ? "bg-[#E8EEFF]/60 border-blue-200" : "bg-[#F8FAFC] border-[#E1E5EB]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${isToday ? "text-[#2563EB]" : "text-[#292D35]"}`}>
                      {w}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-semibold bg-[#2563EB] text-white px-1.5 py-0.2 rounded-full">
                        今日
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#697180] tabular-nums mt-0.5">
                    {date.slice(5).replace("-", ".")}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAdd(date)}
                  className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-[#697180] hover:text-[#2563EB] transition-colors"
                  title="为这天添加课程"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day Sessions List */}
              <div className="p-2 space-y-2 flex-1 flex flex-col">
                {daySessions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#E1E5EB] rounded-lg bg-[#FAFBFD]">
                    <Clock className="w-5 h-5 text-gray-300 mb-1" />
                    <span className="text-xs text-gray-400">无排课</span>
                    <button
                      onClick={() => handleOpenAdd(date)}
                      className="mt-2 text-[11px] text-[#2563EB] hover:underline"
                    >
                      + 添加课次
                    </button>
                  </div>
                ) : (
                  daySessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpenEdit(s)}
                      className="group relative p-2.5 rounded-lg border border-[#E1E5EB] bg-white hover:border-[#2563EB] hover:shadow-xs transition-all text-xs cursor-pointer"
                    >
                      {/* Time & Action buttons */}
                      <div className="flex items-center justify-between text-[#697180]">
                        <span className="font-semibold text-[#292D35] tabular-nums">
                          {s.start_time} - {s.end_time}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(s);
                            }}
                            className="p-1 text-gray-400 hover:text-[#2563EB] transition-colors"
                            title="修改课次与人数容量"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(s.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="删除此课次"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Course Title & Category Badge */}
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <div className="font-semibold text-[#292D35] text-xs truncate">
                          {s.course_name}
                        </div>
                        {s.category_type === "group" ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            团体课
                          </span>
                        ) : s.category_type === "private" ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            私教课
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0">
                            精品课
                          </span>
                        )}
                      </div>

                      {/* Coach & Room */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#697180] mt-1.5">
                        <User className="w-3 h-3 text-[#2563EB] shrink-0" />
                        <span className="truncate">{s.coach_name}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#697180] mt-1">
                        <span className="truncate">{s.room_name || "未分配场地"}</span>
                        <span className="tabular-nums font-semibold text-[#2563EB] bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                          {s.capacity} 人
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div className="mt-2 pt-1.5 border-t border-[#F0F2F6] flex items-center justify-between">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            s.status === "cancelled"
                              ? "bg-red-50 text-red-700"
                              : "bg-emerald-50 text-emerald-700 font-medium"
                          }`}
                        >
                          {s.status === "cancelled" ? "已取消" : "可预约"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#2563EB] font-medium hover:underline">
                            改人数
                          </span>
                          <a
                            href={`/admin/bookings?date=${s.session_date}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-[#697180] hover:text-[#2563EB] hover:underline"
                          >
                            名单
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom quick links */}
      <div className="flex items-center justify-between p-4 bg-white border border-[#E1E5EB] rounded-xl text-xs text-[#697180]">
        <div className="flex items-center gap-4">
          <span>总计排课: {sessions.length} 节</span>
          <span>•</span>
          <span>在任教练: {coaches.length} 位</span>
          <span>•</span>
          <span>可用教室/空间: {rooms.length} 处</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCoachModal(true)}
            className="text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" /> 自定义管理教练
          </button>
          <span>|</span>
          <button
            onClick={() => setShowRoomModal(true)}
            className="text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
          >
            <Building2 className="w-3.5 h-3.5" /> 自定义管理场地
          </button>
          <span>|</span>
          <a href="/admin/coach" className="text-[#2563EB] hover:underline flex items-center gap-1 font-medium">
            查看教练课表与课时统计 <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Drawer: Add Session */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setShowAddDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">手动安排课次</h3>
                  <p className="text-xs text-[#697180] mt-0.5">创建单节课程，系统将自动核验时间冲突并发布到小程序预约端。</p>
                </div>
                <button
                  onClick={() => setShowAddDrawer(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={create} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">选择课程 *</label>
                  <select
                    value={form.courseCategoryId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const sel = activeCourses.find((c) => String(c.id) === cid);
                      const defaultCap = sel?.default_capacity
                        ? String(sel.default_capacity)
                        : sel?.name?.includes("私教")
                        ? "1"
                        : "6";
                      setForm({ ...form, courseCategoryId: cid, capacity: defaultCap });
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 选择课程 --</option>
                    {activeCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.category_type === "group" ? "团体课" : c.category_type === "private" ? "私教课" : "精品课"} ({c.duration_minutes}分钟)
                      </option>
                    ))}
                  </select>
                  {form.courseCategoryId && (
                    <div className="mt-1 text-[11px] text-[#2563EB]">
                      对应小程序分栏：
                      {(() => {
                        const sel = activeCourses.find((c) => String(c.id) === form.courseCategoryId);
                        return sel?.category_type === "group" ? "团体课" : sel?.category_type === "private" ? "私教课" : "精品课";
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#292D35]">主讲教练 *</label>
                    <button
                      type="button"
                      onClick={() => setShowCoachModal(true)}
                      className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> + 自定义添加教练
                    </button>
                  </div>
                  <select
                    value={form.coachId}
                    onChange={(e) => setForm({ ...form, coachId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 选择教练 --</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#292D35]">场地教室 / 空间</label>
                    <button
                      type="button"
                      onClick={() => setShowRoomModal(true)}
                      className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> + 自定义添加场地
                    </button>
                  </div>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 暂不分配 / 待定 --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">排课日期 *</label>
                    <input
                      type="date"
                      value={form.sessionDate}
                      onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">开始时间 *</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#292D35]">本节课可约人数 (容量) *</label>
                    <span className="text-[11px] text-[#2563EB] font-medium">后台可灵活调大调小</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      placeholder="例如 6"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      required
                      className="flex-1 px-3 py-2 text-sm bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-bold text-[#292D35]"
                    />
                    <div className="flex items-center gap-1">
                      {[1, 6, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setForm({ ...form, capacity: String(num) })}
                          className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                            form.capacity === String(num)
                              ? "bg-[#2563EB] text-white border-[#2563EB]"
                              : "bg-[#F4F6F8] text-[#292D35] border-[#E1E5EB] hover:bg-gray-200"
                          }`}
                        >
                          {num === 1 ? "1人(私教)" : `${num}人`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#697180] mt-1">
                    满员后小程序自动提示约满。排课后随时可点击卡片修改人数。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">内部备注</label>
                  <input
                    type="text"
                    placeholder="仅内部可见"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddDrawer(false)}
                    className="px-4 py-2 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {saving ? "正在保存..." : "发布此课次"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Edit Session */}
      {editingSession && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingSession(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">调整课次与人数容量</h3>
                  <p className="text-xs text-[#697180] mt-0.5">随时灵活修改每节课的预约人数上限、教练与场地</p>
                </div>
                <button
                  onClick={() => setEditingSession(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={updateSession} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">课程项目 *</label>
                  <select
                    value={editForm.courseCategoryId}
                    onChange={(e) => setEditForm({ ...editForm, courseCategoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.category_type === "group" ? "团体课" : c.category_type === "private" ? "私教课" : "精品课"} ({c.duration_minutes}分钟)
                      </option>
                    ))}
                  </select>
                  {editForm.courseCategoryId && (
                    <div className="mt-1 text-[11px] text-[#2563EB]">
                      对应小程序分栏：
                      {(() => {
                        const sel = courses.find((c) => String(c.id) === editForm.courseCategoryId);
                        return sel?.category_type === "group" ? "团体课" : sel?.category_type === "private" ? "私教课" : "精品课";
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#292D35]">主讲教练 *</label>
                    <button
                      type="button"
                      onClick={() => setShowCoachModal(true)}
                      className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> + 自定义添加教练
                    </button>
                  </div>
                  <select
                    value={editForm.coachId}
                    onChange={(e) => setEditForm({ ...editForm, coachId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 选择教练 --</option>
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#292D35]">场地教室 / 空间</label>
                    <button
                      type="button"
                      onClick={() => setShowRoomModal(true)}
                      className="text-xs text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> + 自定义添加场地
                    </button>
                  </div>
                  <select
                    value={editForm.roomId}
                    onChange={(e) => setEditForm({ ...editForm, roomId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 暂不分配 / 待定 --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">排课日期 *</label>
                    <input
                      type="date"
                      value={editForm.sessionDate}
                      onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">开始时间 *</label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#292D35]">本节课可约人数 (容量) *</label>
                    <span className="text-[11px] text-[#2563EB] font-medium">后台可灵活调大调小</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={editForm.capacity}
                      onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                      required
                      className="flex-1 px-3 py-2 text-sm bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-bold text-[#292D35]"
                    />
                    <div className="flex items-center gap-1">
                      {[1, 6, 8, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, capacity: String(num) })}
                          className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                            editForm.capacity === String(num)
                              ? "bg-[#2563EB] text-white border-[#2563EB]"
                              : "bg-[#F4F6F8] text-[#292D35] border-[#E1E5EB] hover:bg-gray-200"
                          }`}
                        >
                          {num === 1 ? "1人(私教)" : `${num}人`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#697180] mt-1">
                    满员后小程序自动提示约满。调整此数字后即刻对前端预约生效。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">内部备注</label>
                  <input
                    type="text"
                    placeholder="仅内部可见"
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const id = editingSession.id;
                      setEditingSession(null);
                      setDeleteConfirmId(id);
                    }}
                    className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    删除此课次
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSession(null)}
                      className="px-4 py-2 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                    >
                      {saving ? "保存中..." : "保存修改"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Week Templates */}
      {showTplDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setShowTplDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">周模板规划</h3>
                  <p className="text-xs text-[#697180] mt-0.5">预设每周固定的常规课程，支持一键批量复制到任意指定周。</p>
                </div>
                <button
                  onClick={() => setShowTplDrawer(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <div className="text-xs font-semibold text-[#697180] uppercase tracking-wider mb-2">
                    现有模板 ({templates.length} 条)
                  </div>
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#292D35]">
                            {weekdays[t.weekday - 1]} {t.start_time} · {t.course_name}
                          </div>
                          <div className="text-[#697180] mt-0.5">
                            {t.coach_name} · {t.room_name || "待定教室"} · 容量 {t.capacity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Template */}
                <form onSubmit={addTpl} className="pt-4 border-t border-[#E1E5EB] space-y-3">
                  <div className="text-xs font-semibold text-[#292D35]">添加新模板项</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={tpl.courseId}
                      onChange={(e) => setTpl({ ...tpl, courseId: e.target.value })}
                      required
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                    >
                      <option value="">课程</option>
                      {activeCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={tpl.coachId}
                      onChange={(e) => setTpl({ ...tpl, coachId: e.target.value })}
                      required
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                    >
                      <option value="">教练</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={tpl.roomId}
                      onChange={(e) => setTpl({ ...tpl, roomId: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                    >
                      <option value="">教室(可选)</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={tpl.weekday}
                      onChange={(e) => setTpl({ ...tpl, weekday: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                    >
                      {weekdays.map((w, i) => (
                        <option key={w} value={i + 1}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={tpl.startTime}
                      onChange={(e) => setTpl({ ...tpl, startTime: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="容量（可选）"
                      value={tpl.capacity}
                      onChange={(e) => setTpl({ ...tpl, capacity: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    保存模板项
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Coach Management */}
      {showCoachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-[#E1E5EB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E5EB]">
              <div>
                <h3 className="text-base font-semibold text-[#292D35]">自定义管理教练</h3>
                <p className="text-xs text-[#697180] mt-0.5">新增教练档案，添加后即可在排课时任意指派</p>
              </div>
              <button
                onClick={() => setShowCoachModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Coach */}
            <form onSubmit={addCoach} className="mt-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E5EB] space-y-2">
              <label className="block text-xs font-semibold text-[#292D35]">添加新教练</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入教练姓名（如：周周、小可）"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  required
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shrink-0 shadow-xs"
                >
                  保存并选定
                </button>
              </div>
            </form>

            {/* Coach List */}
            <div className="mt-4">
              <div className="text-xs font-medium text-[#697180] mb-2">当前教练列表（{coaches.length} 位）</div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {coaches.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E1E5EB] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#E8EEFF] text-[#2563EB] flex items-center justify-center font-bold text-[11px]">
                        {c.name.slice(0, 1)}
                      </div>
                      <span className="font-medium text-[#292D35]">{c.name}</span>
                    </div>
                    {c.id !== 1 && c.id !== 11 && (
                      <button
                        type="button"
                        onClick={() => removeCoach(c.id, c.name)}
                        className="text-[11px] text-red-500 hover:text-red-700 hover:underline px-2 py-0.5"
                      >
                        移除
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Room Management */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-[#E1E5EB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E5EB]">
              <div>
                <h3 className="text-base font-semibold text-[#292D35]">自定义管理场地 / 空间</h3>
                <p className="text-xs text-[#697180] mt-0.5">新增或管理排课可选的空间与教室</p>
              </div>
              <button
                onClick={() => setShowRoomModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Room */}
            <form onSubmit={addRoom} className="mt-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E5EB] space-y-2">
              <label className="block text-xs font-semibold text-[#292D35]">添加新场地 / 教室</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="场地名称（如：高定大器械室、1V1私教室）"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shrink-0 shadow-xs"
                >
                  保存并选定
                </button>
              </div>
            </form>

            {/* Room List */}
            <div className="mt-4">
              <div className="text-xs font-medium text-[#697180] mb-2">当前场地列表（{rooms.length} 处）</div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E1E5EB] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#2563EB]" />
                      <span className="font-medium text-[#292D35]">{r.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRoom(r.id, r.name)}
                      className="text-[11px] text-red-500 hover:text-red-700 hover:underline px-2 py-0.5"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">确认删除此课次？</h3>
            <p className="text-xs text-[#697180] mt-1">
              删除后该课次将不再对会员展示；已有学员预约不会自动取消，需到「预约名单」逐个处理。此操作不可逆。
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
