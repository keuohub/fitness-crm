"use client";

import { useEffect, useMemo, useState } from "react";

type Member = { id: number; name: string; phone: string | null };
type Measurement = {
  id: number;
  measured_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  bust_cm: number | null;
  thigh_cm: number | null;
  note: string | null;
  recorded_role: string | null;
};

export default function AdminGrowthPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [memberId, setMemberId] = useState<number | null>(null);
  const [rows, setRows] = useState<Measurement[]>([]);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ measuredOn: "", weightKg: "", waistCm: "", hipCm: "", bustCm: "", thighCm: "", note: "" });

  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : [])).catch(() => setMsg("会员列表加载失败"));
  }, []);

  const shown = useMemo(() => {
    const s = q.trim();
    if (!s) return members.slice(0, 30);
    return members.filter((m) => m.name.includes(s) || String(m.phone || "").includes(s)).slice(0, 30);
  }, [members, q]);

  const load = async (id: number) => {
    setMemberId(id);
    const res = await fetch(`/api/admin/measurements?memberId=${id}`);
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "加载失败"); return; }
    setRows(data.measurements || []);
    setMsg("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) return;
    const res = await fetch("/api/admin/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "保存失败"); return; }
    setForm({ measuredOn: "", weightKg: "", waistCm: "", hipCm: "", bustCm: "", thighCm: "", note: "" });
    setMsg("已记入成长档案");
    await load(memberId);
  };

  const field = (key: keyof typeof form, placeholder: string) => (
    <input value={form[key]} placeholder={placeholder} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      style={{ padding: "8px 10px", border: "1px solid #E1E5EB", borderRadius: 8, width: 120 }} />
  );

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>成长记录</h1>
      <p style={{ color: "#697180", fontSize: 13, marginTop: 0 }}>体重、腰围、臀围、胸围、大腿围。只给这位会员本人、教练和店长看。</p>
      {msg && <div style={{ background: "#FFF8E1", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{msg}</div>}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜姓名或手机号" style={{ padding: "8px 10px", border: "1px solid #E1E5EB", borderRadius: 8, width: 240 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
        {shown.map((m) => (
          <button key={m.id} type="button" onClick={() => load(m.id)} style={{ padding: "6px 10px", borderRadius: 8, border: memberId === m.id ? "1px solid #0D0C0F" : "1px solid #E1E5EB", background: "#fff" }}>
            {m.name}
          </button>
        ))}
      </div>
      {memberId && (
        <form onSubmit={save} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 16 }}>
          {field("measuredOn", "日期 可空=今天")}
          {field("weightKg", "体重kg")}
          {field("waistCm", "腰围")}
          {field("hipCm", "臀围")}
          {field("bustCm", "胸围")}
          {field("thighCm", "大腿围")}
          {field("note", "备注")}
          <button type="submit" style={{ padding: "8px 14px", background: "#0D0C0F", color: "#F6E6DA", border: "none", borderRadius: 8 }}>保存</button>
        </form>
      )}
      {rows.map((r) => (
        <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #F1F3F6", fontSize: 13 }}>
          {r.measured_on} · 体重 {r.weight_kg ?? "—"} · 腰 {r.waist_cm ?? "—"} · 臀 {r.hip_cm ?? "—"} · 胸 {r.bust_cm ?? "—"} · 腿 {r.thigh_cm ?? "—"}
          {r.note ? ` · ${r.note}` : ""} <span style={{ color: "#9CA3AF" }}>{r.recorded_role || ""}</span>
        </div>
      ))}
    </div>
  );
}
