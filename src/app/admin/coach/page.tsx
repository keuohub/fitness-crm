"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  Calendar,
  User,
  Clock,
  MapPin,
  Plus,
  KeyRound,
  Mail,
  Lock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
} from "lucide-react";

type Coach = { id: number; name: string };
type Session = {
  id: number;
  title: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  course_name: string;
  room_name: string | null;
  note: string | null;
};

async function jf(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function CoachTodayPage() {
  const { showToast } = useToast();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachId, setCoachId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCoach, setNewCoach] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    jf("/api/admin/coaches")
      .then((d) => {
        setCoaches(d);
        if (d[0]) setCoachId(String(d[0].id));
      })
      .catch((e) => showToast(e.message, "error"));
  }, []);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    jf(`/api/admin/schedule?from=${date}&to=${date}&coachId=${coachId}`)
      .then(setSessions)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [coachId, date]);

  const createCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoach.name || !newCoach.email || !newCoach.password) {
      showToast("请完整填写教练账号信息", "error");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoach),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "创建失败");
      setNewCoach({ name: "", email: "", password: "" });
      setShowAddModal(false);
      showToast("教练登录账号已成功创建", "success");
      const list = await jf("/api/admin/coaches");
      setCoaches(list);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const currentCoach = useMemo(() => {
    return coaches.find((c) => String(c.id) === coachId);
  }, [coaches, coachId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            COACH ROSTER · 教练课表
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">教练今日课表</h1>
          <p className="text-sm text-[#697180] mt-1">
            按教练筛选今日排课与上课进度。教练账号支持在移动端 /coach 专属入口直接查阅。
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 新建教练账号
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-[#697180] flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-[#2563EB]" /> 选择教练：
          </div>
          <select
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-medium text-[#292D35]"
          >
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-medium text-[#697180] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#2563EB]" /> 排课日期：
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] tabular-nums text-[#292D35]"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-12 text-center text-sm text-[#697180]">
            正在读取课表数据...
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-12 text-center text-sm text-[#697180] flex flex-col items-center justify-center shadow-sm">
            <Clock className="w-10 h-10 text-gray-300 mb-2" />
            <span className="font-semibold text-[#292D35]">
              {currentCoach ? currentCoach.name : "该教练"} 在 {date} 暂无课程安排
            </span>
            <span className="text-xs text-[#697180] mt-1">可在周排课表中为其指派课次。</span>
          </div>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm hover:border-[#2563EB]/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#E8EEFF] text-[#2563EB] font-bold text-sm flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-[#292D35] tabular-nums">
                        {s.start_time} - {s.end_time}
                      </span>
                      <span className="font-medium text-sm text-[#292D35]">· {s.course_name}</span>
                    </div>
                    <div className="text-xs text-[#697180] mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> {s.room_name || "未分配教室"}
                      </span>
                      <span>•</span>
                      <span>容量上限 {s.capacity} 人</span>
                      {s.note && (
                        <>
                          <span>•</span>
                          <span className="text-gray-500">{s.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      s.status === "cancelled"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {s.status === "cancelled" ? "已取消" : "正常上课"}
                  </span>
                  <a
                    href={`/admin/bookings?date=${s.session_date}`}
                    className="px-3 py-1.5 text-xs text-[#2563EB] bg-[#E8EEFF] hover:bg-blue-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" /> 查阅学员名单
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Coach portal tip */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E1E5EB] rounded-xl text-xs text-[#697180] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#2563EB]" />
          <span>教练专属移动端登录入口：<code className="text-[#2563EB] font-mono">/coach</code> （教练只能查阅自己名下的课次与学员）</span>
        </div>
        <a href="/coach" target="_blank" className="text-[#2563EB] hover:underline flex items-center gap-1">
          直达入口 <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Modal: Add Coach */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">新建教练登录账号</h3>
            <p className="text-xs text-[#697180] mt-1">
              创建后可将邮箱与初始密码交由教练，教练可在手机端查看每日课表。
            </p>

            <form onSubmit={createCoach} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">姓名 *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="例如：周教练"
                    value={newCoach.name}
                    onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                    required
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">登录邮箱 *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="coach@laiwufit.com"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach({ ...newCoach, email: e.target.value })}
                    required
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D35] mb-1">初始密码 *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="至少6位密码"
                    value={newCoach.password}
                    onChange={(e) => setNewCoach({ ...newCoach, password: e.target.value })}
                    required
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EB] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? "正在创建..." : "确认创建账号"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
