"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MemberItem {
  id: number;
  name: string;
  phone: string | null;
  joinedAt: string | null;
  status: string;
  notes: string | null;
}

interface FeelingItem {
  id: number;
  member_id: number;
  member_name: string;
  feeling: string;
  xiaoqiao_reply: string | null;
  created_at: string;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [feelings, setFeelings] = useState<FeelingItem[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "feelings">("members");
  const [loading, setLoading] = useState(true);
  const [replyingItem, setReplyingItem] = useState<FeelingItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resM, resF] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/portal/training-feelings?limit=30").catch(() => null),
      ]);
      if (resM.ok) {
        const mData = await resM.json();
        if (Array.isArray(mData)) setMembers(mData);
      }
      if (resF && resF.ok) {
        const fData = await resF.json();
        if (Array.isArray(fData)) setFeelings(fData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingItem || !replyText.trim()) return;
    setSavingReply(true);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: replyingItem.id,
          xiaoqiaoReply: replyText.trim(),
        }),
      });
      if (res.ok) {
        setReplyingItem(null);
        setReplyText("");
        fetchData();
      } else {
        alert("回音保存失败");
      }
    } catch (err) {
      alert("请求异常");
    } finally {
      setSavingReply(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      {/* 头部标题 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>
          💬 第 4 板块：我的账户 · 会员档案与手札回音管理
        </h1>
        <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8, margin: 0, lineHeight: 1.5 }}>
          对应微信小程序第四个板块「我的账户」，管理学员的基础档案资料、伴行自律数据，并对学员提交的体感手札进行<b>导师小桥亲笔回音</b>。
        </p>
      </div>

      {/* 切换栏 */}
      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid #EBE4DF", marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("members")}
          style={{
            padding: "10px 20px", background: "none", border: "none",
            borderBottom: activeTab === "members" ? "2px solid #0E0D10" : "2px solid transparent",
            color: activeTab === "members" ? "#1C1415" : "#8C827B",
            fontWeight: activeTab === "members" ? 700 : 500, fontSize: 14, cursor: "pointer"
          }}
        >
          会员名录 ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("feelings")}
          style={{
            padding: "10px 20px", background: "none", border: "none",
            borderBottom: activeTab === "feelings" ? "2px solid #0E0D10" : "2px solid transparent",
            color: activeTab === "feelings" ? "#1C1415" : "#8C827B",
            fontWeight: activeTab === "feelings" ? 700 : 500, fontSize: 14, cursor: "pointer"
          }}
        >
          学员体感手札 & 导师回音 ({feelings.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#8C827B" }}>加载中...</div>
      ) : activeTab === "members" ? (
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBE4DF", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAF7F5", borderBottom: "1px solid #EBE4DF", color: "#6D645D" }}>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>会员卡号</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>会员姓名</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>绑定手机号</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>入会时间</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>状态</th>
                <th style={{ padding: "14px 18px", fontWeight: 600, textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #F0EAE6" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 600, color: "#1C1415" }}>LW{m.id}</td>
                  <td style={{ padding: "14px 18px", fontWeight: 600, color: "#1C1415", fontFamily: "serif" }}>{m.name}</td>
                  <td style={{ padding: "14px 18px", color: "#6D645D" }}>{m.phone || "—"}</td>
                  <td style={{ padding: "14px 18px", color: "#8C827B" }}>{m.joinedAt ? m.joinedAt.slice(0, 10) : "2026-10-02"}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ fontSize: 11, background: "rgba(46, 125, 50, 0.1)", color: "#2E7D32", padding: "3px 8px", borderRadius: 12, fontWeight: 600 }}>
                      活跃
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <Link
                      href={`/admin/transformation`}
                      style={{ fontSize: 12, color: "#0E0D10", fontWeight: 600, textDecoration: "none", background: "#FAF7F5", padding: "6px 12px", borderRadius: 6, border: "1px solid #D1C7C1" }}
                    >
                      查看蜕变档案 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {feelings.length === 0 ? (
            <div style={{ background: "#FFFFFF", padding: 40, textAlign: "center", color: "#8C827B", borderRadius: 12, border: "1px dashed #D1C7C1" }}>
              暂无学员留言手札
            </div>
          ) : (
            feelings.map((f) => (
              <div key={f.id} style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBE4DF", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1C1415" }}>
                    {f.member_name} <span style={{ fontSize: 12, color: "#8C827B", fontWeight: 400 }}>· 提交于 {f.created_at?.slice(0, 16)}</span>
                  </span>
                  <button
                    onClick={() => {
                      setReplyingItem(f);
                      setReplyText(f.xiaoqiao_reply || "");
                    }}
                    style={{ background: "#0E0D10", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    {f.xiaoqiao_reply ? "修改导师回信" : "撰写小桥亲笔回音"}
                  </button>
                </div>

                <div style={{ background: "#FAF7F5", padding: "12px 16px", borderRadius: 8, fontSize: 13, color: "#4A403E", marginBottom: 10, lineHeight: 1.5 }}>
                  <strong style={{ color: "#1C1415" }}>学员手札：</strong> {f.feeling}
                </div>

                {f.xiaoqiao_reply && (
                  <div style={{ background: "rgba(158, 42, 43, 0.05)", borderLeft: "3px solid #9E2A2B", padding: "10px 14px", borderRadius: 4, fontSize: 13, color: "#5E1914" }}>
                    <strong>印 导师小桥 · 亲笔回音：</strong> {f.xiaoqiao_reply}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 回信弹窗 */}
      {replyingItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 540, padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
              撰写导师小桥亲笔回音 · {replyingItem.member_name}
            </h3>
            <p style={{ fontSize: 13, color: "#6D645D", marginBottom: 14 }}>
              <strong>学员原留言：</strong> {replyingItem.feeling}
            </p>
            <form onSubmit={handleSendReply}>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="亲爱的，看到你说肩颈舒展了、呼吸顺畅了，我特别开心！..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setReplyingItem(null)}
                  style={{ padding: "8px 18px", background: "#FAF7F5", border: "1px solid #D1C7C1", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingReply}
                  style={{ padding: "8px 20px", background: "#0E0D10", color: "#FFFFFF", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {savingReply ? "保存中..." : "保存亲笔回音"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
