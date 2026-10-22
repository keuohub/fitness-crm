"use client";
import { useEffect, useState } from "react";

type Row = Record<string, any>;
type Data = { counts: Record<string, number>; lowBalance: Row[]; inactive30d: Row[]; expiring: Row[]; birthdays: Row[] };

const box: React.CSSProperties = { background: "#fff", border: "1px solid #EBE4DF", borderRadius: 12, overflow: "hidden" };
const th: React.CSSProperties = { textAlign: "left", padding: "11px 16px", background: "#FAF7F5", color: "#6D645D", fontWeight: 600 };
const td: React.CSSProperties = { padding: "11px 16px", borderTop: "1px solid #F0EAE6" };

export default function AdminFollowUpsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/follow-ups").then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "加载失败");
      setData(d);
    }).catch((e) => setError(e.message));
  }, []);

  const sections: { key: keyof Omit<Data, "counts">; title: string; hint: string }[] = [
    { key: "lowBalance", title: "剩余课次不足", hint: "剩余 ≤ 3 次" },
    { key: "inactive30d", title: "30 天未到", hint: "按最近到课日期" },
    { key: "expiring", title: "30 天内到期", hint: "期限卡即将到期" },
    { key: "birthdays", title: "近 30 天生日", hint: "按生日提醒" },
  ];

  return <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
    <div style={{ fontSize: 13, color: "#8B5E3C", marginBottom: 6 }}>后台 / 跟进名单</div>
    <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>跟进名单</h1>
    <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8 }}>只基于真实会员卡、到课和生日数据；点开会员可去档案补备注。</p>
    {error && <div style={{ background: "#FDECEA", color: "#8A1F17", padding: "10px 14px", borderRadius: 8, marginTop: 16, fontSize: 13 }}>{error}</div>}
    {!data && !error && <div style={{ marginTop: 30, color: "#8C827B", fontSize: 13 }}>正在加载…</div>}
    {data && <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}>
      {sections.map((s) => {
        const rows = data[s.key] as Row[];
        return <div key={s.key} style={box}>
          <div style={{ padding: "15px 18px", borderBottom: "1px solid #EBE4DF", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</span>
            <span style={{ fontSize: 12, color: "#8C827B" }}>{s.hint} · {rows.length} 人</span>
          </div>
          {rows.length === 0 ? <div style={{ padding: "18px", color: "#8C827B", fontSize: 13 }}>暂无</div> :
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr><th style={th}>会员</th><th style={th}>信息</th><th style={th}>建议</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i}>
                <td style={td}>#{r.member_id} {r.member_name || r.name}<div style={{ fontSize: 11, color: "#8C827B" }}>{r.member_phone || r.phone || ""}</div></td>
                <td style={td}>
                  {s.key === "lowBalance" && `${r.card_name} · 剩余 ${r.remaining_count} 次`}
                  {s.key === "inactive30d" && `最近到课：${r.last_attended || "无记录"}`}
                  {s.key === "expiring" && `${r.card_name} · ${r.valid_until} 到期`}
                  {s.key === "birthdays" && `${String(r.birthday).slice(0, 10)} · 还有 ${r.days_until} 天`}
                </td>
                <td style={td}>
                  {s.key === "lowBalance" ? "提醒续卡" : s.key === "inactive30d" ? "问候 + 约课" : s.key === "expiring" ? "提醒续费" : "生日问候"}
                </td>
              </tr>)}</tbody>
            </table>}
        </div>;
      })}
    </div>}
  </div>;
}
