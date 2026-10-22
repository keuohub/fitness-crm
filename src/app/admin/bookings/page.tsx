"use client";

import { useEffect, useState } from "react";

type Session = {
  id: number; session_date: string; start_time: string; end_time: string;
  capacity: number; booked_count: number; status: string;
  course_name: string; coach_name: string; room_name: string | null;
};
type Booking = {
  id: number; session_id: number; member_id: number; member_name: string;
  member_phone: string | null; status: string; booked_at: string;
  cancelled_at: string | null; cancel_reason: string | null;
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
const statusMap: Record<string, string> = {
  booked: "已预约", attended: "已到课", cancelled: "已取消", no_show: "未到",
};

export default function AdminReservationsPage() {
  const [date, setDate] = useState(today());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const d = await jf(`/api/admin/reservations?date=${date}`);
      setSessions(d.sessions || []);
      setBookings(d.bookings || []);
      setMsg("");
    } catch (e: any) { setMsg(e.message); }
  };
  useEffect(() => { load(); }, [date]);

  const cancel = async (b: Booking) => {
    if (!confirm(`取消 ${b.member_name} 的预约？`)) return;
    try {
      await jf("/api/admin/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: b.id, reason: "后台取消" }),
      });
      await load();
      setMsg("已取消并释放名额");
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ fontSize: 13, color: "#8B5E3C", marginBottom: 6 }}>后台 / 预约名单</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>预约名单</h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8 }}>
            按课次看预约会员；取消后自动释放名额。预约由会员端发起，后台只做名单与异常取消。
          </p>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14 }} />
      </div>

      {msg && <div style={{ background: "#FFF8E1", border: "1px solid #F0D9A8", color: "#6B4E16", padding: "10px 14px", borderRadius: 8, margin: "16px 0", fontSize: 13 }}>{msg}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
        {sessions.length === 0 && (
          <div style={{ background: "#fff", border: "1px dashed #D1C7C1", borderRadius: 12, padding: "30px", textAlign: "center", color: "#8C827B", fontSize: 13 }}>
            这一天没有排课
          </div>
        )}
        {sessions.map((s) => {
          const list = bookings.filter((b) => b.session_id === s.id);
          return (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #EBE4DF", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #EBE4DF", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#1C1415" }}>{s.start_time}-{s.end_time} · {s.course_name}</span>
                  <span style={{ fontSize: 12, color: "#8C827B", marginLeft: 12 }}>{s.coach_name} · {s.room_name || "未分配教室"}</span>
                </div>
                <div style={{ fontSize: 12, color: s.booked_count >= s.capacity ? "#9E2A2B" : "#2E7D4F" }}>
                  {s.booked_count}/{s.capacity} 已约
                </div>
              </div>
              {list.length === 0 ? (
                <div style={{ padding: "18px 20px", fontSize: 13, color: "#8C827B" }}>还没有会员预约</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#FAF7F5", color: "#6D645D" }}>
                      <th style={{ textAlign: "left", padding: "10px 20px" }}>会员</th>
                      <th style={{ textAlign: "left", padding: "10px 20px" }}>状态</th>
                      <th style={{ textAlign: "left", padding: "10px 20px" }}>预约时间</th>
                      <th style={{ textAlign: "right", padding: "10px 20px" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((b) => (
                      <tr key={b.id} style={{ borderTop: "1px solid #F0EAE6" }}>
                        <td style={{ padding: "11px 20px" }}>
                          #{b.member_id} {b.member_name}
                          <span style={{ fontSize: 11, color: "#8C827B", marginLeft: 8 }}>{b.member_phone || ""}</span>
                        </td>
                        <td style={{ padding: "11px 20px" }}>{statusMap[b.status] || b.status}</td>
                        <td style={{ padding: "11px 20px", color: "#8C827B" }}>{String(b.booked_at).slice(0, 16)}</td>
                        <td style={{ padding: "11px 20px", textAlign: "right" }}>
                          {b.status === "booked" && (
                            <button onClick={() => cancel(b)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E0C9C5", background: "#FDF2F1", color: "#8A1F17", fontSize: 12 }}>
                              取消
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
