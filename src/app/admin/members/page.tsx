"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MemberItem {
  id: number;
  name: string;
  phone: string | null;
  memberCode: string | null;
  mentorName: string | null;
  loginPin?: string | null;
  totalHours: number | null;
  hoursPilates: number | null;
  hoursEquipment: number | null;
  hoursFatBurn: number | null;
  hoursPrivate: number | null;
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

  // 回信弹窗状态
  const [replyingItem, setReplyingItem] = useState<FeelingItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  // 会员编辑弹窗状态
  const [editingMember, setEditingMember] = useState<Partial<MemberItem> | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  // 新增手札状态
  const [showAddFeeling, setShowAddFeeling] = useState(false);
  const [newFeelingMemberId, setNewFeelingMemberId] = useState<number>(0);
  const [newFeelingText, setNewFeelingText] = useState("");
  const [newFeelingReply, setNewFeelingReply] = useState("");
  const [savingNewFeeling, setSavingNewFeeling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resM, resF] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/admin/training-feelings").catch(() => null),
      ]);
      if (resM.ok) {
        const mData = await resM.json();
        if (Array.isArray(mData)) {
          setMembers(mData);
          if (mData.length > 0 && newFeelingMemberId === 0) {
            setNewFeelingMemberId(mData[0].id);
          }
        }
      }
      if (resF && resF.ok) {
        const fData = await resF.json();
        const fList = Array.isArray(fData) ? fData : fData?.items;
        if (Array.isArray(fList)) setFeelings(fList);
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

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.id) return;
    setSavingMember(true);
    try {
      const res = await fetch(`/api/members/${editingMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingMember.name,
          memberCode: editingMember.memberCode,
          mentorName: editingMember.mentorName,
          totalHours: (editingMember.hoursPilates || 0) + (editingMember.hoursEquipment || 0) + (editingMember.hoursFatBurn || 0) + (editingMember.hoursPrivate || 0),
          hoursPilates: typeof editingMember.hoursPilates === "number" ? editingMember.hoursPilates : null,
          hoursEquipment: typeof editingMember.hoursEquipment === "number" ? editingMember.hoursEquipment : null,
          hoursFatBurn: typeof editingMember.hoursFatBurn === "number" ? editingMember.hoursFatBurn : null,
          hoursPrivate: typeof editingMember.hoursPrivate === "number" ? editingMember.hoursPrivate : null,
          joinedAt: editingMember.joinedAt,
          status: editingMember.status,
        }),
      });
      if (res.ok) {
        setEditingMember(null);
        fetchData();
      } else {
        alert("保存会员信息失败");
      }
    } catch (err) {
      alert("请求异常");
    } finally {
      setSavingMember(false);
    }
  };

  const handleCreateFeeling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeelingMemberId || !newFeelingText.trim()) {
      alert("请选择学员并输入体感手札！");
      return;
    }
    setSavingNewFeeling(true);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: newFeelingMemberId,
          feeling: newFeelingText.trim(),
          xiaoqiaoReply: newFeelingReply.trim() || null,
        }),
      });
      if (res.ok) {
        setShowAddFeeling(false);
        setNewFeelingText("");
        setNewFeelingReply("");
        fetchData();
      } else {
        alert("录入失败");
      }
    } catch (err) {
      alert("网络请求失败");
    } finally {
      setSavingNewFeeling(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      {/* 头部标题 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 13, color: "#8B5E3C", textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            ← 返回管理总览
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>
            💬 第 4 板块：我的账户 · 会员资产与手札回音管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8, margin: 0, lineHeight: 1.5 }}>
            对应微信小程序第四个板块「我的账户」。总课时数在上方突出展示，各分课时（普拉提/大器械/超模减脂）在下方细分，支持直接修改并实时同步到小程序。
          </p>
        </div>
      </div>

      {/* 切换栏 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EBE4DF", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => setActiveTab("members")}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "members" ? "2px solid #0E0D10" : "2px solid transparent",
              color: activeTab === "members" ? "#1C1415" : "#8C827B",
              fontWeight: activeTab === "members" ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            会员名录与档案 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("feelings")}
            style={{
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "feelings" ? "2px solid #0E0D10" : "2px solid transparent",
              color: activeTab === "feelings" ? "#1C1415" : "#8C827B",
              fontWeight: activeTab === "feelings" ? 700 : 500,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            学员体感手札 & 导师回音 ({feelings.length})
          </button>
        </div>

        {activeTab === "feelings" && (
          <button
            onClick={() => setShowAddFeeling(true)}
            style={{
              padding: "8px 16px",
              background: "#5E1914",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(94,25,20,0.2)",
            }}
          >
            ＋ 录入真实学员体感手札
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#8C827B" }}>加载中...</div>
      ) : activeTab === "members" ? (
        <div style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBE4DF", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#FAF7F5", borderBottom: "1px solid #EBE4DF", color: "#6D645D" }}>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>会员卡号</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>姓名</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>专属导师</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>累计上课（节）</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>四类课时（会员端展示）</th>
                <th style={{ padding: "14px 18px", fontWeight: 600 }}>入会时间</th>
                <th style={{ padding: "14px 18px", fontWeight: 600, textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #F0EAE6" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 600, color: "#1C1415" }}>
                    {m.memberCode || `LW-${String(m.id).padStart(6, "0")}`}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 600, color: "#1C1415", fontFamily: "serif" }}>{m.name}</td>
                  <td style={{ padding: "14px 18px", color: "#5E1914", fontWeight: 500 }}>
                    {m.mentorName || "导师 小桥"}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: 700, color: "#0E0D10", fontSize: 14 }}>
                    {(m.hoursPilates || 0) + (m.hoursEquipment || 0) + (m.hoursFatBurn || 0) + (m.hoursPrivate || 0) || m.totalHours || "—"} <span style={{ fontSize: 11, fontWeight: 400, color: "#8C827B" }}>节</span>
                  </td>
                  <td style={{ padding: "14px 18px", color: "#4A403E" }}>
                    <span style={{ background: "#F5ECE5", color: "#5E1914", padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                      普拉提: {m.hoursPilates ?? "—"}
                    </span>
                    <span style={{ background: "#F5ECE5", color: "#5E1914", padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                      大器械: {m.hoursEquipment ?? "—"}
                    </span>
                    <span style={{ background: "#F5ECE5", color: "#5E1914", padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                      超模班: {m.hoursFatBurn ?? "—"}
                    </span>
                    <span style={{ background: "#F5ECE5", color: "#5E1914", padding: "2px 6px", borderRadius: 4 }}>
                      私教: {m.hoursPrivate ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: "#8C827B" }}>{m.joinedAt ? m.joinedAt.slice(0, 10) : "待录入"}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => setEditingMember(m)}
                      style={{
                        fontSize: 12,
                        color: "#5E1914",
                        fontWeight: 600,
                        background: "#FAF7F5",
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #D1C7C1",
                        marginRight: 8,
                        cursor: "pointer",
                      }}
                    >
                      编辑课时与档案
                    </button>
                    <Link
                      href={`/admin/transformation`}
                      style={{
                        fontSize: 12,
                        color: "#0E0D10",
                        fontWeight: 600,
                        textDecoration: "none",
                        background: "#FAF7F5",
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid #D1C7C1",
                      }}
                    >
                      蜕变档案 →
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
                  <strong style={{ color: "#1C1415" }}>学员手札：</strong> “{f.feeling}”
                </div>

                {f.xiaoqiao_reply && (
                  <div style={{ background: "rgba(158, 42, 43, 0.05)", borderLeft: "3px solid #9E2A2B", padding: "12px 16px", borderRadius: 4, fontSize: 13, color: "#5E1914", lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ background: "#9E2A2B", color: "#fff", fontSize: 11, padding: "1px 5px", borderRadius: 3 }}>印</span>
                      导师小桥 · 亲笔手札回音：
                    </div>
                    <div>{f.xiaoqiao_reply}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 编辑会员课时与档案弹窗 */}
      {editingMember && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 18px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
              编辑会员档案与课时资产 · {editingMember.name}
            </h3>
            <form onSubmit={handleSaveMember} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                    会员姓名 <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMember.name || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                    会员卡号
                  </label>
                  <input
                    type="text"
                    value={editingMember.memberCode || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, memberCode: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                    专属导师
                  </label>
                  <input
                    type="text"
                    value={editingMember.mentorName || "导师 小桥"}
                    onChange={(e) => setEditingMember({ ...editingMember, mentorName: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                    入会日期
                  </label>
                  <input
                    type="text"
                    placeholder="如：2025-10-20"
                    value={editingMember.joinedAt || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, joinedAt: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                  登录PIN（无手机号会员的第二因子）
                </label>
                <div style={{ fontSize: 13, color: "#1C1415", background: "#F3EDE8", borderRadius: 6, padding: "8px 12px", letterSpacing: 2 }}>
                  {editingMember.loginPin || "该会员使用手机尾号验证"}
                </div>
              </div>
              </div>

              <div style={{ background: "#FAF7F5", padding: 16, borderRadius: 10, border: "1px solid #EBE4DF" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 13, color: "#5E1914", fontWeight: 700 }}>
                  📊 训练度量资产（实时同步小程序端）
                </h4>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    累计上课（自动 = 下面四类相加，会员端直接显示）
                  </label>
                  <div style={{ padding: "10px 12px", background: "#F3EDE8", borderRadius: 6, fontSize: 20, fontWeight: 700, color: "#5E1914" }}>
                    {(editingMember.hoursPilates || 0) + (editingMember.hoursEquipment || 0) + (editingMember.hoursFatBurn || 0) + (editingMember.hoursPrivate || 0)} 节
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6D645D", marginBottom: 4 }}>
                      精品普拉提课（节）
                    </label>
                    <input
                      type="number"
                      value={editingMember.hoursPilates ?? ""}
                      onChange={(e) => setEditingMember({ ...editingMember, hoursPilates: Number(e.target.value) })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6D645D", marginBottom: 4 }}>
                      高定大器械课（节）
                    </label>
                    <input
                      type="number"
                      value={editingMember.hoursEquipment ?? ""}
                      onChange={(e) => setEditingMember({ ...editingMember, hoursEquipment: Number(e.target.value) })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6D645D", marginBottom: 4 }}>
                      维密超模班（节）
                    </label>
                    <input
                      type="number"
                      value={editingMember.hoursFatBurn ?? ""}
                      onChange={(e) => setEditingMember({ ...editingMember, hoursFatBurn: Number(e.target.value) })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#6D645D", marginBottom: 4 }}>
                      私教课（节）
                    </label>
                    <input
                      type="number"
                      value={editingMember.hoursPrivate ?? ""}
                      onChange={(e) => setEditingMember({ ...editingMember, hoursPrivate: Number(e.target.value) })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  style={{ padding: "8px 18px", background: "#FAF7F5", border: "1px solid #D1C7C1", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  style={{ padding: "8px 24px", background: "#5E1914", color: "#FFFFFF", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {savingMember ? "保存中..." : "保存课时修改"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增学员体感手札弹窗 */}
      {showAddFeeling && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
              录入真实学员体感手札与回音
            </h3>
            <p style={{ fontSize: 12, color: "#6D645D", marginBottom: 14, lineHeight: 1.5 }}>
              录入真实的训练体感细节与小桥亲笔手札，将直接同步展示在对应学员微信小程序的「我的账户」中，极具情感共鸣与社交分享欲。
            </p>
            <form onSubmit={handleCreateFeeling} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                  所属学员
                </label>
                <select
                  value={newFeelingMemberId}
                  onChange={(e) => setNewFeelingMemberId(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.memberCode || `LW${m.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                  学员真实体感描述 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={newFeelingText}
                  onChange={(e) => setNewFeelingText(e.target.value)}
                  placeholder="例如：连续练了两个月普拉提大器械，最神奇的是前两天拍证件照，摄影师突然说我肩膀完全是平的，脖子线条显得特别长。以前我习惯性右肩内扣高低肩，现在坐一天电脑居然不自觉会沉肩呼吸。"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                  导师小桥亲笔手札回音 (富有情绪价值与专业洞察)
                </label>
                <textarea
                  rows={3}
                  value={newFeelingReply}
                  onChange={(e) => setNewFeelingReply(e.target.value)}
                  placeholder="例如：知意，看到你分享这个瞬间我由衷为你感动。这不是摄影师的角度巧合，而是你过去几十个小时里，每一次在核心床滑行台对抗弹簧、每一次把肋骨收拢和下斜方肌激活沉淀出来的身体记忆。骨骼回归中立位后，从容感是由内而外散发出来的。身体永远不会辜负专注的练习，继续享受这种舒展。"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowAddFeeling(false)}
                  style={{ padding: "8px 18px", background: "#FAF7F5", border: "1px solid #D1C7C1", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingNewFeeling}
                  style={{ padding: "8px 24px", background: "#5E1914", color: "#FFFFFF", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {savingNewFeeling ? "录入中..." : "保存手札"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改回信弹窗 */}
      {replyingItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 540, padding: 28, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
              修改导师小桥亲笔回音 · {replyingItem.member_name}
            </h3>
            <p style={{ fontSize: 13, color: "#6D645D", marginBottom: 14 }}>
              <strong>学员原留言：</strong> “{replyingItem.feeling}”
            </p>
            <form onSubmit={handleSendReply}>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="撰写小桥导师亲笔手札..."
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
