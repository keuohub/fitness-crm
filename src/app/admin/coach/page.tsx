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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Users,
  BarChart3,
  Award,
  TrendingUp,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import CalendarRangePicker from "@/components/admin/CalendarRangePicker";

type Coach = { id: number; name: string; email?: string };

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

type CoachStatSession = {
  id: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  courseName: string;
  roomName: string;
  capacity: number;
  bookedCount: number;
  attendedCount: number;
  status: "completed" | "upcoming" | "cancelled";
  rawStatus: string;
};

type CoachStat = {
  coachId: number;
  coachName: string;
  email: string;
  avatarUrl: string | null;
  totalSessions: number;
  completedSessions: number;
  completedHours: number;
  upcomingSessions: number;
  cancelledSessions: number;
  totalBookings: number;
  totalAttended: number;
  totalCapacity: number;
  attendanceRate: number;
  fillRate: number;
  sessions: CoachStatSession[];
};

type StatsSummary = {
  totalCoaches: number;
  totalSessions: number;
  completedSessions: number;
  completedHours: number;
  upcomingSessions: number;
  cancelledSessions: number;
  totalBookings: number;
  totalAttended: number;
};

async function jf(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getMonthStart = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

const getMonthEnd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

const getPrevMonthRange = () => {
  const now = new Date();
  const dt = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

const getRecent30DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: formatDateStr(start), end: formatDateStr(end) };
};

const getThisWeekRange = () => {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day - 1));
  const sun = new Date(now);
  sun.setDate(now.getDate() + (7 - day));
  return { start: formatDateStr(mon), end: formatDateStr(sun) };
};

export default function CoachTodayPage() {
  const { showToast } = useToast();

  // Tab 切换：stats（课时与绩效统计） / roster（单日排课与花名册）
  const [activeTab, setActiveTab] = useState<"stats" | "roster">("stats");

  // 1. 自选起止日期统计状态（前面开始日期，后面截止日期）
  const [startDate, setStartDate] = useState(getMonthStart());
  const [endDate, setEndDate] = useState(getMonthEnd());
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsData, setStatsData] = useState<{
    period: { from: string; to: string };
    summary: StatsSummary;
    coaches: CoachStat[];
  } | null>(null);
  const [expandedCoachId, setExpandedCoachId] = useState<number | null>(null);

  // 2. 单日排课状态
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachId, setCoachId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // 3. 新建教练账号弹窗
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCoach, setNewCoach] = useState({ name: "", email: "", password: "" });

  // 加载教练列表
  useEffect(() => {
    jf("/api/admin/coaches")
      .then((d) => {
        setCoaches(d);
        if (d[0]) setCoachId(String(d[0].id));
      })
      .catch((e) => showToast(e.message, "error"));
  }, []);

  // 加载自选起止日期课时统计
  const loadStats = (from: string, to: string) => {
    if (!from || !to) return;
    setStatsLoading(true);
    jf(`/api/admin/coaches/stats?from=${from}&to=${to}`)
      .then((data) => {
        setStatsData(data);
      })
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setStatsLoading(false));
  };

  useEffect(() => {
    loadStats(startDate, endDate);
  }, [startDate, endDate]);

  // 加载单日课表
  useEffect(() => {
    if (!coachId) return;
    setRosterLoading(true);
    jf(`/api/admin/schedule?from=${date}&to=${date}&coachId=${coachId}`)
      .then(setSessions)
      .catch((e) => showToast(e.message, "error"))
      .finally(() => setRosterLoading(false));
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
      loadStats(startDate, endDate);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const currentCoach = useMemo(() => {
    return coaches.find((c) => String(c.id) === coachId);
  }, [coaches, coachId]);

  // 快捷区间切换
  const applyPreset = (type: "thisMonth" | "prevMonth" | "thisWeek" | "recent30") => {
    if (type === "thisMonth") {
      setStartDate(getMonthStart());
      setEndDate(getMonthEnd());
    } else if (type === "prevMonth") {
      const p = getPrevMonthRange();
      setStartDate(p.start);
      setEndDate(p.end);
    } else if (type === "thisWeek") {
      const w = getThisWeekRange();
      setStartDate(w.start);
      setEndDate(w.end);
    } else if (type === "recent30") {
      const r = getRecent30DaysRange();
      setStartDate(r.start);
      setEndDate(r.end);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 头部标题区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            COACH HOURS & PERFORMANCE · 教练课时与绩效管理
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight flex items-center gap-2">
            <span>教练课表与课时统计</span>
            <span className="text-[11px] font-normal text-[#2563EB] bg-[#E8EEFF] px-2 py-0.5 rounded-full">v1.4 可视日历版</span>
          </h1>
          <p className="text-sm text-[#697180] mt-1">
            自定义起止日期筛选各教练已上课时数、执教节数与学员人次，作为课时费结算和绩效考勤的统一依据。
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新建教练账号
          </button>
        </div>
      </div>

      {/* 视图切换 Tabs */}
      <div className="flex border-b border-[#E1E5EB] bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-2xs">
        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "stats"
              ? "border-[#2563EB] text-[#2563EB]"
              : "border-transparent text-[#697180] hover:text-[#292D35]"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> 教练课时与绩效汇总
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "roster"
              ? "border-[#2563EB] text-[#2563EB]"
              : "border-transparent text-[#697180] hover:text-[#292D35]"
          }`}
        >
          <Calendar className="w-4 h-4" /> 单日排课与花名册
        </button>
      </div>

      {/* TAB 1: 课时与绩效统计 */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* 可视化日历选择工具栏 */}
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-medium text-[#697180] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2563EB]" /> 统计周期：
              </span>

              {/* 点击直接弹出可视化日历表，彻底告别手打 */}
              <CalendarRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                }}
              />

              {/* 快捷预设按钮 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset("thisMonth")}
                  className="px-2.5 py-1 text-xs font-medium text-[#2563EB] bg-[#E8EEFF] hover:bg-blue-100 rounded-md transition-colors"
                >
                  本月
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("prevMonth")}
                  className="px-2.5 py-1 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-[#F3F4F6] hover:bg-gray-200 rounded-md transition-colors"
                >
                  上月
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("thisWeek")}
                  className="px-2.5 py-1 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-[#F3F4F6] hover:bg-gray-200 rounded-md transition-colors"
                >
                  本周
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("recent30")}
                  className="px-2.5 py-1 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-[#F3F4F6] hover:bg-gray-200 rounded-md transition-colors"
                >
                  近30天
                </button>
              </div>
            </div>

            <div className="text-xs text-[#697180]">
              结算标准：60分钟 = 1.0课时 · 仅统计未取消且时间已到达的已上课次
            </div>
          </div>

          {/* 汇总核心指标卡片 */}
          {statsData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-medium text-[#697180] flex items-center justify-between">
                  <span>累计已上课时</span>
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="text-2xl font-bold text-[#292D35] mt-2 tabular-nums">
                  {statsData.summary.completedHours.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-[#697180]">课时</span>
                </div>
                <div className="text-xs text-[#697180] mt-1">
                  共计 {statsData.summary.completedSessions} 节已完成课程
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-medium text-[#697180] flex items-center justify-between">
                  <span>期间总排课</span>
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-[#292D35] mt-2 tabular-nums">
                  {statsData.summary.totalSessions}{" "}
                  <span className="text-xs font-normal text-[#697180]">节</span>
                </div>
                <div className="text-xs text-[#697180] mt-1">
                  待上课 {statsData.summary.upcomingSessions} 节 · 已取消 {statsData.summary.cancelledSessions} 节
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-medium text-[#697180] flex items-center justify-between">
                  <span>学员服务人次</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-[#292D35] mt-2 tabular-nums">
                  {statsData.summary.totalAttended}{" "}
                  <span className="text-xs font-normal text-[#697180]">人次</span>
                </div>
                <div className="text-xs text-[#697180] mt-1">
                  累计预约 {statsData.summary.totalBookings} 人次
                </div>
              </div>

              <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-medium text-[#697180] flex items-center justify-between">
                  <span>在任执教教练</span>
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-[#292D35] mt-2 tabular-nums">
                  {statsData.summary.totalCoaches}{" "}
                  <span className="text-xs font-normal text-[#697180]">位</span>
                </div>
                <div className="text-xs text-[#697180] mt-1">全部教练统一课时考勤</div>
              </div>
            </div>
          )}

          {/* 教练课时排行榜与绩效表格 */}
          <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E1E5EB] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#292D35]">各教练课时核算与绩效明细</h2>
                <p className="text-xs text-[#697180] mt-0.5">
                  按已上课时数从高到低排序，点击教练行可展开查看每堂课的排课与学员签到明细。
                </p>
              </div>
              <div className="text-xs font-medium text-[#2563EB] bg-[#E8EEFF] px-2.5 py-1 rounded-md tabular-nums">
                统计周期：{startDate} 至 {endDate}
              </div>
            </div>

            {statsLoading ? (
              <div className="p-12 text-center text-sm text-[#697180]">
                正在统计各教练课时数据...
              </div>
            ) : !statsData || statsData.coaches.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#697180]">
                暂无教练数据
              </div>
            ) : (
              <div className="divide-y divide-[#E1E5EB]">
                {/* 表头 */}
                <div className="grid grid-cols-12 px-5 py-3 text-xs font-medium text-[#697180] bg-[#F8FAFC]">
                  <div className="col-span-1">排名</div>
                  <div className="col-span-3">教练姓名</div>
                  <div className="col-span-2 text-right">已上课时(结算)</div>
                  <div className="col-span-2 text-right">已上节数 / 总排课</div>
                  <div className="col-span-2 text-right">学员到课人次</div>
                  <div className="col-span-2 text-right">操作</div>
                </div>

                {/* 教练行 */}
                {statsData.coaches.map((c, index) => {
                  const isExpanded = expandedCoachId === c.coachId;
                  return (
                    <div key={c.coachId} className="group">
                      <div
                        onClick={() => setExpandedCoachId(isExpanded ? null : c.coachId)}
                        className={`grid grid-cols-12 px-5 py-3.5 text-xs items-center cursor-pointer transition-colors ${
                          isExpanded
                            ? "bg-blue-50/50"
                            : "hover:bg-[#F9FAFB] bg-white"
                        }`}
                      >
                        {/* 排名 */}
                        <div className="col-span-1">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold tabular-nums ${
                              index === 0
                                ? "bg-amber-100 text-amber-800"
                                : index === 1
                                ? "bg-gray-200 text-gray-800"
                                : index === 2
                                ? "bg-amber-50 text-amber-900"
                                : "text-gray-500"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </div>

                        {/* 姓名 */}
                        <div className="col-span-3">
                          <div className="font-semibold text-sm text-[#292D35] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#2563EB]" />
                            {c.coachName}
                          </div>
                          <div className="text-[11px] text-[#697180] mt-0.5 font-mono truncate max-w-[180px]">
                            {c.email || "未绑定邮箱"}
                          </div>
                        </div>

                        {/* 已上课时 (核心指标) */}
                        <div className="col-span-2 text-right">
                          <div className="text-base font-bold text-[#2563EB] tabular-nums">
                            {c.completedHours.toFixed(1)}{" "}
                            <span className="text-xs font-normal text-[#697180]">课时</span>
                          </div>
                          <div className="text-[11px] text-[#697180]">课时费基准</div>
                        </div>

                        {/* 已上节数 / 总排课 */}
                        <div className="col-span-2 text-right">
                          <div className="font-semibold text-[#292D35] tabular-nums">
                            {c.completedSessions}{" "}
                            <span className="text-[#697180] font-normal">/ {c.totalSessions} 节</span>
                          </div>
                          <div className="text-[11px] text-[#697180]">
                            待上 {c.upcomingSessions} 节
                          </div>
                        </div>

                        {/* 学员到课人次 */}
                        <div className="col-span-2 text-right">
                          <div className="font-semibold text-[#292D35] tabular-nums">
                            {c.totalAttended}{" "}
                            <span className="text-[#697180] font-normal">人次</span>
                          </div>
                          <div className="text-[11px] text-[#697180]">
                            预约 {c.totalBookings} 人次
                          </div>
                        </div>

                        {/* 操作 */}
                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:text-blue-700 bg-white border border-[#E1E5EB] px-2.5 py-1 rounded-md shadow-2xs group-hover:border-blue-300"
                          >
                            {isExpanded ? (
                              <>
                                收起明细 <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                查看明细 <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 展开的每堂课明细 */}
                      {isExpanded && (
                        <div className="bg-[#F8FAFC] border-y border-[#E1E5EB] px-6 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold text-[#292D35] flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-[#2563EB]" />
                              {c.coachName} 教练 · 执教课程明细（共 {c.sessions.length} 节）
                            </div>
                            <div className="text-xs text-[#697180]">
                              已结算上课：{c.completedSessions} 节（{c.completedHours.toFixed(1)} 课时）
                            </div>
                          </div>

                          {c.sessions.length === 0 ? (
                            <div className="text-xs text-[#697180] py-4 text-center bg-white rounded-lg border border-[#E1E5EB]">
                              该教练在此期间暂无排课记录
                            </div>
                          ) : (
                            <div className="bg-white border border-[#E1E5EB] rounded-lg overflow-hidden shadow-2xs">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-[#F1F4F9] text-[#697180] border-b border-[#E1E5EB]">
                                  <tr>
                                    <th className="py-2 px-3 font-medium">上课日期</th>
                                    <th className="py-2 px-3 font-medium">时间段</th>
                                    <th className="py-2 px-3 font-medium">课程名称</th>
                                    <th className="py-2 px-3 font-medium">教室</th>
                                    <th className="py-2 px-3 font-medium text-right">核算课时</th>
                                    <th className="py-2 px-3 font-medium text-right">预约/到课</th>
                                    <th className="py-2 px-3 font-medium text-right">课程状态</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E5EB]">
                                  {c.sessions.map((s) => (
                                    <tr key={s.id} className="hover:bg-blue-50/20">
                                      <td className="py-2 px-3 font-medium text-[#292D35] tabular-nums">
                                        {s.sessionDate}
                                      </td>
                                      <td className="py-2 px-3 text-[#697180] tabular-nums">
                                        {s.startTime} - {s.endTime}
                                      </td>
                                      <td className="py-2 px-3 font-semibold text-[#292D35]">
                                        {s.courseName}
                                      </td>
                                      <td className="py-2 px-3 text-[#697180]">
                                        {s.roomName}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold text-[#2563EB] tabular-nums">
                                        {s.durationHours.toFixed(1)} 课时
                                      </td>
                                      <td className="py-2 px-3 text-right tabular-nums">
                                        <span className="font-medium text-[#292D35]">{s.attendedCount}</span>
                                        <span className="text-gray-400"> / {s.capacity} 人</span>
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        {s.status === "completed" ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <CheckCircle2 className="w-2.5 h-2.5" /> 已上课
                                          </span>
                                        ) : s.status === "cancelled" ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                                            已取消
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                            待上课
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: 单日排课与花名册 */}
      {activeTab === "roster" && (
        <div className="space-y-6">
          {/* 单日筛选工具栏 */}
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

          {/* 单日课程卡片列表 */}
          <div className="space-y-3">
            {rosterLoading ? (
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
        </div>
      )}

      {/* 底部移动端提示栏 */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E1E5EB] rounded-xl text-xs text-[#697180] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#2563EB]" />
          <span>
            教练专属移动端登录入口：<code className="text-[#2563EB] font-mono">/coach</code> （教练只能查阅自己名下的课次与学员）
          </span>
        </div>
        <a href="/coach" target="_blank" className="text-[#2563EB] hover:underline flex items-center gap-1">
          直达入口 <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 弹窗：新建教练登录账号 */}
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
                  className="px-4 py-1.5 text-xs text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? "正在创建..." : "确认创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
