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
} from "lucide-react";

type Course = { id: number; name: string; duration_minutes: number; default_capacity: number };
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
  course_name: string;
  coach_name: string;
  room_name: string | null;
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Forms
  const [coachName, setCoachName] = useState("");
  const [form, setForm] = useState({
    courseCategoryId: "",
    coachId: "",
    roomId: "",
    sessionDate: "",
    startTime: "09:00",
    capacity: "",
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

  const handleOpenAdd = (date?: string) => {
    setForm((prev) => ({
      ...prev,
      sessionDate: date || fmt(new Date()),
      courseCategoryId: courses[0]?.id ? String(courses[0].id) : "",
      coachId: coaches[0]?.id ? String(coaches[0].id) : "",
      roomId: rooms[0]?.id ? String(rooms[0].id) : "",
    }));
    setShowAddDrawer(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseCategoryId || !form.coachId || !form.sessionDate || !form.startTime) {
      showToast("请完整填写排课必填信息", "error");
      return;
    }
    setSaving(true);
    setWarnings([]);
    try {
      const res = await jf("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? Number(form.capacity) : undefined,
        }),
      });
      if (res.warnings?.length) {
        setWarnings(res.warnings);
        showToast("课次已创建（注意：存在时间或场地冲突）", "error");
      } else {
        showToast("课次已成功保存", "success");
      }
      setShowAddDrawer(false);
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
      await load();
      showToast("课次已成功删除", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const addCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachName.trim()) return;
    try {
      await jf("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: coachName.trim() }),
      });
      setCoachName("");
      setShowCoachModal(false);
      await load();
      showToast("教练已新增", "success");
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

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-800">检测到排课冲突提示：</div>
            {warnings.map((w, i) => (
              <div key={i} className="text-amber-700">
                • {w}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Week Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekdays.map((w, i) => {
          const date = addDays(week, i);
          const isToday = date === todayStr;
          const daySessions = sessions
            .filter((s) => s.session_date === date)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div
              key={date}
              className={`flex flex-col bg-white border rounded-xl overflow-hidden shadow-sm min-h-[500px] transition-all ${
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
                      className="group relative p-2.5 rounded-lg border border-[#E1E5EB] bg-white hover:border-[#2563EB]/40 hover:shadow-xs transition-all text-xs"
                    >
                      {/* Time & Delete */}
                      <div className="flex items-center justify-between text-[#697180]">
                        <span className="font-semibold text-[#292D35] tabular-nums">
                          {s.start_time} - {s.end_time}
                        </span>
                        <button
                          onClick={() => setDeleteConfirmId(s.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity"
                          title="删除此课次"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Course Title */}
                      <div className="font-medium text-[#292D35] mt-1 text-xs truncate">
                        {s.course_name}
                      </div>

                      {/* Coach & Room */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#697180] mt-1.5">
                        <User className="w-3 h-3 text-[#2563EB] shrink-0" />
                        <span className="truncate">{s.coach_name}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#697180] mt-1">
                        <span className="truncate">{s.room_name || "未分配教室"}</span>
                        <span className="tabular-nums font-medium text-[#292D35]">
                          容量 {s.capacity}
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
                        <a
                          href={`/admin/bookings?date=${s.session_date}`}
                          className="text-[10px] text-[#2563EB] hover:underline"
                        >
                          名单
                        </a>
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
          <span>可用教室: {rooms.length} 间</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCoachModal(true)}
            className="text-[#2563EB] hover:underline flex items-center gap-1 font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" /> 加教练
          </button>
          <span>|</span>
          <a href="/admin/coach" className="text-[#2563EB] hover:underline flex items-center gap-1 font-medium">
            查看教练今日课表 <ArrowRight className="w-3 h-3" />
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
                    onChange={(e) => setForm({ ...form, courseCategoryId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 选择课程 --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.duration_minutes}分钟)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">主讲教练 *</label>
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
                  <label className="block text-xs font-medium text-[#292D35] mb-1">场地教室</label>
                  <select
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">-- 暂不分配 / 待定 --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (容量 {r.capacity} 人)
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
                  <label className="block text-xs font-medium text-[#292D35] mb-1">预约容量上限（留空使用默认）</label>
                  <input
                    type="number"
                    placeholder="例如 6"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
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
                      {courses.map((c) => (
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

      {/* Modal: Add Coach */}
      {showCoachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">快速新增教练</h3>
            <p className="text-xs text-[#697180] mt-1">添加新教练档案，即可在排课时指派。</p>
            <form onSubmit={addCoach} className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="教练姓名，如：周教练"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoachModal(false)}
                  className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  保存
                </button>
              </div>
            </form>
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
