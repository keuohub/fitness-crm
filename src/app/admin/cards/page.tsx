"use client";

import { useEffect, useState } from "react";

type CardType = {
  id: number; name: string; category: string; priceCents: number;
  totalCount: number | null; validityDays: number | null; weeklyLimit: number | null;
  isActive: number;
};
type Member = { id: number; name: string; phone: string | null; status: string };
type MemberCard = {
  id: number; member_id: number; member_name: string; member_phone: string | null;
  card_name: string; category: string; status: string;
  total_count: number | null; remaining_count: number | null;
  valid_from: string | null; valid_until: string | null; price_cents: number;
};

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

const money = (cents: number) => (Number(cents || 0) / 100).toFixed(0);
const statusText: Record<string, string> = {
  active: "有效", frozen: "已冻结", exhausted: "已用完", expired: "已过期",
};

export default function AdminCardsPage() {
  const [types, setTypes] = useState<CardType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cards, setCards] = useState<MemberCard[]>([]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [newType, setNewType] = useState({
    name: "", category: "count", priceYuan: "", totalCount: "", validityDays: "", weeklyLimit: "",
  });
  const [issue, setIssue] = useState({ memberId: "", cardTypeId: "", validFrom: "", validUntil: "" });

  const load = async () => {
    try {
      const [t, m, c] = await Promise.all([
        jsonFetch("/api/admin/card-types"),
        jsonFetch("/api/members"),
        jsonFetch("/api/admin/member-cards"),
      ]);
      setTypes(t);
      setMembers(m.filter((x: Member) => x.status !== "archived"));
      setCards(c);
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const createType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg("");
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
        }),
      });
      setNewType({ name: "", category: "count", priceYuan: "", totalCount: "", validityDays: "", weeklyLimit: "" });
      await load();
      setMsg("卡类型已新增");
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const issueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.memberId || !issue.cardTypeId) { setMsg("请选择会员和卡类型"); return; }
    setSaving(true); setMsg("");
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: Number(issue.memberId),
          cardTypeId: Number(issue.cardTypeId),
          validFrom: issue.validFrom || undefined,
          validUntil: issue.validUntil || undefined,
          idempotencyKey: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }),
      });
      setIssue({ ...issue, memberId: "", cardTypeId: "" });
      await load();
      setMsg("开卡成功");
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const toggleFreeze = async (card: MemberCard) => {
    const action = card.status === "frozen" ? "unfreeze" : "freeze";
    try {
      await jsonFetch("/api/admin/member-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCardId: card.id, action }),
      });
      await load();
      setMsg(action === "freeze" ? "已冻结" : "已解冻");
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: "#8B5E3C", marginBottom: 6 }}>后台 / 会员卡</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>会员卡与开卡</h1>
        <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8, margin: 0 }}>
          先建卡类型，再给会员开卡。开卡后会员端「我的卡」会立即显示余额/有效期。
        </p>
      </div>

      {msg && (
        <div style={{ background: "#FFF8E1", border: "1px solid #F0D9A8", color: "#6B4E16", padding: "10px 14px", borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <form onSubmit={issueCard} style={{ background: "#FFFFFF", border: "1px solid #EBE4DF", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 14px", color: "#5E1914" }}>给会员开卡</h2>
          <label style={{ display: "block", fontSize: 12, color: "#6D645D", marginBottom: 6 }}>会员</label>
          <select value={issue.memberId} onChange={(e) => setIssue({ ...issue, memberId: e.target.value })}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #D1C7C1", marginBottom: 12, fontSize: 13 }}>
            <option value="">选择会员</option>
            {members.map((m) => <option key={m.id} value={m.id}>#{m.id} {m.name} {m.phone || ""}</option>)}
          </select>
          <label style={{ display: "block", fontSize: 12, color: "#6D645D", marginBottom: 6 }}>卡类型</label>
          <select value={issue.cardTypeId} onChange={(e) => setIssue({ ...issue, cardTypeId: e.target.value })}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #D1C7C1", marginBottom: 12, fontSize: 13 }}>
            <option value="">选择卡类型</option>
            {types.filter((t) => t.isActive).map((t) => (
              <option key={t.id} value={t.id}>{t.name} · {t.category === "count" ? `${t.totalCount}次` : `${t.validityDays}天`} · {money(t.priceCents)}元</option>
            ))}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6D645D", marginBottom: 6 }}>生效日（可选）</label>
              <input type="date" value={issue.validFrom} onChange={(e) => setIssue({ ...issue, validFrom: e.target.value })}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6D645D", marginBottom: 6 }}>到期日（可选）</label>
              <input type="date" value={issue.validUntil} onChange={(e) => setIssue({ ...issue, validUntil: e.target.value })}
                style={{ width: "100%", padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <button disabled={saving} style={{ width: "100%", padding: "11px 0", background: "#0D0C0F", color: "#F6E6DA", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "处理中..." : "确认开卡"}
          </button>
        </form>

        <form onSubmit={createType} style={{ background: "#FFFFFF", border: "1px solid #EBE4DF", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 14px", color: "#5E1914" }}>新增卡类型</h2>
          <input placeholder="卡名称，如 普拉提次卡" value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })}
            style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid #D1C7C1", marginBottom: 12, fontSize: 13, boxSizing: "border-box" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <select value={newType.category} onChange={(e) => setNewType({ ...newType, category: e.target.value })}
              style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13 }}>
              <option value="count">次数卡</option>
              <option value="period">期限卡</option>
            </select>
            <input type="number" placeholder="售价（元）" value={newType.priceYuan} onChange={(e) => setNewType({ ...newType, priceYuan: e.target.value })}
              style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {newType.category === "count" ? (
              <input type="number" placeholder="总次数" value={newType.totalCount} onChange={(e) => setNewType({ ...newType, totalCount: e.target.value })}
                style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13 }} />
            ) : (
              <input type="number" placeholder="有效天数" value={newType.validityDays} onChange={(e) => setNewType({ ...newType, validityDays: e.target.value })}
                style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13 }} />
            )}
            <input type="number" placeholder="每周限次（可选）" value={newType.weeklyLimit} onChange={(e) => setNewType({ ...newType, weeklyLimit: e.target.value })}
              style={{ padding: "9px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13 }} />
          </div>
          <button disabled={saving} style={{ width: "100%", padding: "11px 0", background: "#5E1914", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "处理中..." : "新增卡类型"}
          </button>
        </form>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #EBE4DF", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EBE4DF", fontSize: 15, fontWeight: 600, color: "#1C1415" }}>
          最近开卡记录
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#FAF7F5", color: "#6D645D" }}>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>会员</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>卡</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>状态</th>
              <th style={{ textAlign: "left", padding: "12px 16px" }}>剩余/有效期</th>
              <th style={{ textAlign: "right", padding: "12px 16px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid #F0EAE6" }}>
                <td style={{ padding: "12px 16px" }}>#{c.member_id} {c.member_name}</td>
                <td style={{ padding: "12px 16px" }}>{c.card_name} · {c.category === "count" ? "次数卡" : "期限卡"}</td>
                <td style={{ padding: "12px 16px" }}>{statusText[c.status] || c.status}</td>
                <td style={{ padding: "12px 16px" }}>
                  {c.category === "count" ? `${c.remaining_count ?? 0} 次` : `${c.valid_until || "—"} 到期`}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <button onClick={() => toggleFreeze(c)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #D1C7C1", background: "#FAF7F5", fontSize: 12, cursor: "pointer" }}>
                    {c.status === "frozen" ? "解冻" : "冻结"}
                  </button>
                </td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#8C827B" }}>还没有开卡记录</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
