"use client";

import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Filter,
  X,
} from "lucide-react";

type Session = {
  id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: string;
  course_name: string;
  coach_name: string;
  room_name: string | null;
};

type Booking = {
  id: number;
  session_id: number;
  member_id: number;
  member_name: string;
  member_phone: string | null;
  status: string;
  booked_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

async function jf(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "请求失败");
  return d;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function addDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const statusBadge: Record<string, { label: string; bg: string; text: string; border: string }> = {
  booked: { label: "已预约", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  waitlisted: { label: "候补", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  attended: { label: "已到课", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { label: "已取消", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
  no_show: { label: "未到", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export default function AdminReservationsPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(() => {
    if (typeof window === "undefined") return today();
    const p = new URLSearchParams(window.location.search).get("date");
    return p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : today();
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Cancel Modal
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("后台手动取消");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const d = await jf(`/api/admin/reservations?date=${date}`);
      setSessions(d.sessions || []);
      setBookings(d.bookings || []);
    } catch (e: any) {
      showToast(e.message || "加载预约名单失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [date]);

  const confirmCancel = async () => {
    if (!cancellingBooking) return;
    setSubmitting(true);
    try {
      await jf("/api/admin/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: cancellingBooking.id,
          reason: cancelReason || "后台取消",
        }),
      });
      setCancellingBooking(null);
      await load();
      showToast(`已取消 ${cancellingBooking.member_name} 的预约，名额已释放`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const totalBooked = useMemo(() => {
    return bookings.filter((b) => b.status === "booked").length;
  }, [bookings]);

  const totalAttended = useMemo(() => {
    return bookings.filter((b) => b.status === "attended").length;
  }, [bookings]);

  const totalCapacity = useMemo(() => {
    return sessions.reduce((acc, s) => acc + s.capacity, 0);
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            DAILY RESERVATIONS · 预约名单与签到
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">课次预约名单</h1>
          <p className="text-sm text-[#697180] mt-1">
            按排课核验学员预约名册，提供快捷签到记录与异常名额取消。
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#E1E5EB] rounded-lg shadow-sm p-1">
            <button
              onClick={() => setDate(addDate(date, -1))}
              className="p-1.5 hover:bg-[#F5F7FA] rounded text-[#697180] hover:text-[#292D35] transition-colors"
              title="前一天"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2 py-1 text-xs font-medium text-[#292D35] bg-transparent border-none focus:outline-none tabular-nums cursor-pointer"
            />
            <button
              onClick={() => setDate(addDate(date, 1))}
              className="p-1.5 hover:bg-[#F5F7FA] rounded text-[#697180] hover:text-[#292D35] transition-colors"
              title="后一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDate(today())}
              className="ml-1 px-2.5 py-1 text-xs text-[#2563EB] hover:bg-[#E8EEFF] rounded font-medium transition-colors"
            >
              今日
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">本日课次数</div>
          <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">{sessions.length}</div>
          <div className="text-xs text-[#697180] mt-1">已安排课次</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">有效预约人数</div>
          <div className="text-2xl font-bold text-[#2563EB] mt-1.5 tabular-nums">{totalBooked}</div>
          <div className="text-xs text-[#697180] mt-1">待到课学员</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">累计到课人次</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">{totalAttended}</div>
          <div className="text-xs text-[#697180] mt-1">已签到</div>
        </div>
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-[#697180]">场馆满载率</div>
          <div className="text-2xl font-bold text-[#292D35] mt-1.5 tabular-nums">
            {totalCapacity > 0 ? `${Math.round(((totalBooked + totalAttended) / totalCapacity) * 100)}%` : "0%"}
          </div>
          <div className="text-xs text-[#697180] mt-1">容量总计 {totalCapacity} 席位</div>
        </div>
      </div>

      {/* Sessions & Bookings Roster */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-12 text-center text-[#697180] text-sm shadow-sm">
            正在读取今日预约数据...
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-12 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
            <Calendar className="w-10 h-10 text-gray-300 mb-2" />
            <span className="font-medium text-[#292D35]">该日期尚未安排任何排课</span>
            <span className="text-xs text-[#697180] mt-1">可前往周排课工作台一键生成课表或手动排课。</span>
            <a
              href="/admin/schedule"
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm"
            >
              前往周排课
            </a>
          </div>
        ) : (
          sessions.map((s) => {
            const list = bookings.filter((b) => b.session_id === s.id);
            const isFull = s.booked_count >= s.capacity;
            return (
              <div
                key={s.id}
                className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden"
              >
                {/* Session Header Card */}
                <div className="p-4 bg-[#F8FAFC] border-b border-[#E1E5EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E8EEFF] text-[#2563EB] flex items-center justify-center font-bold text-sm shrink-0">
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
                          <User className="w-3.5 h-3.5 text-[#2563EB]" /> {s.coach_name}
                        </span>
                        <span>•</span>
                        <span>{s.room_name || "未指定教室"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-[#697180]">预约席位</div>
                      <div className="text-sm font-semibold tabular-nums text-[#292D35]">
                        <span className={isFull ? "text-amber-600 font-bold" : "text-[#2563EB]"}>
                          {s.booked_count}
                        </span>{" "}
                        / {s.capacity}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        isFull
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {isFull ? "已约满" : "可预约"}
                    </span>
                  </div>
                </div>

                {/* Bookings Table for this session */}
                {list.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#697180]">
                    该课次目前暂无学员预约
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#FAFBFD] border-b border-[#E1E5EB] text-[#697180] text-xs font-medium">
                        <tr>
                          <th className="px-5 py-2.5">学员</th>
                          <th className="px-5 py-2.5">预约状态</th>
                          <th className="px-5 py-2.5">预约时间</th>
                          <th className="px-5 py-2.5">备注说明</th>
                          <th className="px-5 py-2.5 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1E5EB]">
                        {list.map((b) => {
                          const badge = statusBadge[b.status] || {
                            label: b.status,
                            bg: "bg-gray-100",
                            text: "text-gray-600",
                            border: "border-gray-200",
                          };
                          return (
                            <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-[#E8EEFF] text-[#2563EB] font-semibold text-xs flex items-center justify-center shrink-0">
                                    {b.member_name ? b.member_name.slice(0, 1) : "学"}
                                  </div>
                                  <div>
                                    <div className="font-medium text-[#292D35] flex items-center gap-1.5 text-xs">
                                      {b.member_name}
                                      <span className="font-mono text-[10px] text-[#697180] bg-[#F0F2F6] px-1 py-0.2 rounded">
                                        #LW{b.member_id}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#697180] tabular-nums">
                                      {b.member_phone || "未留手机"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                                >
                                  {badge.label}
                                </span>
                              </td>

                              <td className="px-5 py-3 text-xs text-[#697180] tabular-nums">
                                {String(b.booked_at || "").slice(0, 16).replace("T", " ")}
                              </td>

                              <td className="px-5 py-3 text-xs text-[#697180]">
                                {b.cancel_reason ? (
                                  <span className="text-red-600 text-[11px]">取消原因: {b.cancel_reason}</span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="px-5 py-3 text-right">
                                {b.status === "booked" || b.status === "waitlisted" ? (
                                  <button
                                    onClick={() => {
                                      setCancellingBooking(b);
                                      setCancelReason("后台取消");
                                    }}
                                    className="px-2.5 py-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
                                  >
                                    取消预约
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">已完结</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Confirm Cancel Booking */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">
              取消预约确认
            </h3>
            <p className="text-xs text-[#697180] mt-1">
              确认取消学员 <strong className="text-[#292D35]">{cancellingBooking.member_name}</strong> 的本次课程预约？取消后仅释放该课次名额（课时在教练签到环节扣除，此处不会改动）。
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium text-[#292D35] mb-1">取消原因</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="例如：学员因私请假 / 课程调整"
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
              >
                放弃
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmCancel}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? "正在处理..." : "确认取消并释放名额"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
