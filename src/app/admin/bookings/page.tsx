"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * 预约管理
 *
 * 会员在小程序里约了课，落库时是 pending。
 * 这一页是唯一能把它变成 confirmed 的地方 ——
 * 在此之前，"已确认"这个状态在系统里从来没有出现过一次。
 */

type Booking = {
  id: number;
  memberId: number;
  memberName: string | null;
  courseType: string;
  bookingDate: string;
  bookingTime: string;
  coachId: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "待确认", color: "#8A4B3A", bg: "#FBEDE7", border: "#F0D8CE" },
  confirmed: { label: "已确认", color: "#2E7D32", bg: "#F3F7F3", border: "#D9E6D9" },
  cancelled: { label: "已取消", color: "#9E948E", bg: "#F7F5F3", border: "#E8E1DB" },
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];

export default function AdminBookingsPage() {
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState<string>(ymd(today));
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [hint, setHint] = useState("");

  // 前后各三天的一条时间带：工作室就是这么看日子的
  const days = useMemo(() => {
    const arr: { key: string; date: Date; label: string; sub: string }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = ymd(d);
      arr.push({
        key,
        date: d,
        label: i === 0 ? "今天" : i === 1 ? "明天" : i === -1 ? "昨天" : `周${WEEK_CN[d.getDay()]}`,
        sub: `${d.getMonth() + 1}/${d.getDate()}`,
      });
    }
    return arr;
  }, [today]);

  const load = async (date: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/course-bookings?date=${date}`);
      if (res.status === 401) {
        setError("登录已过期，请重新登录管理后台。");
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "读取失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(selected);
  }, [selected]);

  const changeStatus = async (b: Booking, status: "confirmed" | "cancelled") => {
    setBusy(b.id);
    try {
      const res = await fetch("/api/admin/course-bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "操作失败");
      setHint(status === "confirmed" ? `已确认 ${b.memberName || "她"} 的课` : "已取消这一节");
      setTimeout(() => setHint(""), 2600);
      await load(selected);
    } catch (e: any) {
      setHint(e?.message || "操作失败");
      setTimeout(() => setHint(""), 3000);
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C1415", margin: 0, letterSpacing: 0.3 }}>
          预约管理
        </h1>
        {pendingCount > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#8A4B3A",
              background: "#FBEDE7",
              border: "1px solid #F0D8CE",
              padding: "2px 9px",
              borderRadius: 999,
            }}
          >
            这天有 {pendingCount} 节待确认
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: "#8C827B", margin: "0 0 20px", lineHeight: 1.7 }}>
        会员在小程序里约课后，这里会立刻出现。确认之后她才会收到确定的消息；
        一直不确认，她只会看到"已提交"。
      </p>

      {/* 日期带 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {days.map((d) => {
          const isOn = d.key === selected;
          return (
            <button
              key={d.key}
              onClick={() => setSelected(d.key)}
              style={{
                minWidth: 68,
                padding: "8px 10px",
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                border: isOn ? "1px solid #0E0D10" : "1px solid #E2D9D2",
                background: isOn ? "#0E0D10" : "#fff",
                transition: "all .15s ease",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: isOn ? "#F6E6DA" : "#4A403E" }}>
                {d.label}
              </span>
              <span style={{ fontSize: 10.5, color: isOn ? "rgba(246,230,218,.65)" : "#A89E97" }}>
                {d.sub}
              </span>
            </button>
          );
        })}
        <input
          type="date"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            marginLeft: "auto",
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #E2D9D2",
            fontSize: 12.5,
            color: "#4A403E",
            background: "#fff",
          }}
        />
      </div>

      {hint && (
        <div
          style={{
            marginBottom: 14,
            padding: "9px 14px",
            borderRadius: 8,
            background: "#F3F7F3",
            border: "1px solid #D9E6D9",
            color: "#2E7D32",
            fontSize: 13,
          }}
        >
          {hint}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            background: "#FDF3F0",
            border: "1px solid #F0D8CE",
            color: "#8A4B3A",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {loading && !error && (
        <div style={{ padding: "56px 0", textAlign: "center", color: "#A89E97", fontSize: 13 }}>
          正在查这一天的课…
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div
          style={{
            padding: "56px 24px",
            textAlign: "center",
            background: "#fff",
            border: "1px dashed #E2D9D2",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 15, color: "#4A403E", fontWeight: 600, marginBottom: 8 }}>
            {selected} 还没有人约
          </div>
          <div style={{ fontSize: 13, color: "#9E948E", lineHeight: 1.8 }}>
            会员在小程序「课程」页提交预约后，这里会立刻出现。
            <br />
            如果长期为空，先确认会员端那个「立即预约」按钮是否真的提交成功了。
          </div>
        </div>
      )}

      {/* 预约卡片 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((b) => {
          const st = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
          return (
            <div
              key={b.id}
              style={{
                background: "#fff",
                border: "1px solid #EBE4DF",
                borderRadius: 14,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 2px 10px rgba(14,13,16,0.03)",
              }}
            >
              {/* 时间 */}
              <div
                style={{
                  flex: "0 0 76px",
                  textAlign: "center",
                  borderRight: "1px solid #F4EEE9",
                  paddingRight: 14,
                }}
              >
                <div style={{ fontSize: 19, fontWeight: 700, color: "#1C1415", letterSpacing: 0.5 }}>
                  {b.bookingTime || "--:--"}
                </div>
                <div style={{ fontSize: 10.5, color: "#A89E97", marginTop: 2 }}>{b.bookingDate}</div>
              </div>

              {/* 主体 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: "#1C1415" }}>
                    {b.memberName || `会员 #${b.memberId}`}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: st.color,
                      background: st.bg,
                      border: `1px solid ${st.border}`,
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 600,
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#6D645D", marginTop: 4 }}>
                  {b.courseType}
                  {b.notes ? <span style={{ color: "#9E948E" }}> · {b.notes}</span> : null}
                </div>
              </div>

              {/* 操作 */}
              <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                {b.status !== "confirmed" && (
                  <button
                    onClick={() => changeStatus(b, "confirmed")}
                    disabled={busy === b.id}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: busy === b.id ? "wait" : "pointer",
                      background: "#0E0D10",
                      color: "#F6E6DA",
                      border: "none",
                      opacity: busy === b.id ? 0.6 : 1,
                    }}
                  >
                    确认
                  </button>
                )}
                {b.status !== "cancelled" && (
                  <button
                    onClick={() => changeStatus(b, "cancelled")}
                    disabled={busy === b.id}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      cursor: "pointer",
                      background: "#fff",
                      color: "#9E948E",
                      border: "1px solid #E2D9D2",
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
