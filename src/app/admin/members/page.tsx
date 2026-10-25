"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  X,
  Edit3,
  Plus,
  Table as TableIcon,
  LayoutGrid,
  TrendingUp,
  MessageSquare,
  Check,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/components/admin/Toast";

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
  const { showToast } = useToast();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [feelings, setFeelings] = useState<FeelingItem[]>([]);
  const [activeTab, setActiveTab] = useState<"members" | "feelings">("members");
  const [loading, setLoading] = useState(true);

  // 搜索关键字（实时筛选会员编号、姓名、手机号）
  const [searchQuery, setSearchQuery] = useState("");

  // 视图模式：桌面表格 vs iPad/移动端卡片视图
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // 会员编辑抽屉状态
  const [editingMember, setEditingMember] = useState<Partial<MemberItem> | null>(null);
  const [savingMember, setSavingMember] = useState(false);

  // 回信抽屉状态
  const [replyingItem, setReplyingItem] = useState<FeelingItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);

  // 新增手札抽屉状态
  const [showAddFeeling, setShowAddFeeling] = useState(false);
  // 新增会员抽屉
  const [showAddMember, setShowAddMember] = useState(false);
  const [savingNewMember, setSavingNewMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    gender: "",
    birthday: "",
    joinedAt: "",
    mentorName: "",
    notes: "",
  });
  const [createdCred, setCreatedCred] = useState<{ name: string; portalCode: string; loginPin: string } | null>(null);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) {
      showToast("请填写会员姓名", "warning");
      return;
    }
    setSavingNewMember(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "新增会员失败");
      setCreatedCred({
        name: data.name,
        portalCode: data.portalCode || data.portal_code || "",
        loginPin: data.loginPin || data.login_pin || "",
      });
      setNewMember({ name: "", phone: "", gender: "", birthday: "", joinedAt: "", mentorName: "", notes: "" });
      await fetchData();
      showToast("会员已新增，并已自动开通小程序登录", "success");
    } catch (err: any) {
      showToast(err.message || "新增会员失败", "error");
    } finally {
      setSavingNewMember(false);
    }
  };

  const copyCred = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label + "已复制", "success");
    } catch {
      showToast("复制失败，请手动选中复制", "error");
    }
  };
  const [newFeelingMemberId, setNewFeelingMemberId] = useState<number>(0);
  const [newFeelingFilter, setNewFeelingFilter] = useState("");
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
      showToast("获取会员数据失败，请检查网络", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || params.get("search");
      if (q) setSearchQuery(q);
    }
  }, []);

  // 保存课时与档案修改
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
          totalHours:
            (editingMember.hoursPilates || 0) +
            (editingMember.hoursEquipment || 0) +
            (editingMember.hoursFatBurn || 0) +
            (editingMember.hoursPrivate || 0),
          hoursPilates:
            typeof editingMember.hoursPilates === "number" ? editingMember.hoursPilates : null,
          hoursEquipment:
            typeof editingMember.hoursEquipment === "number" ? editingMember.hoursEquipment : null,
          hoursFatBurn:
            typeof editingMember.hoursFatBurn === "number" ? editingMember.hoursFatBurn : null,
          hoursPrivate:
            typeof editingMember.hoursPrivate === "number" ? editingMember.hoursPrivate : null,
          joinedAt: editingMember.joinedAt,
          status: editingMember.status,
        }),
      });
      if (res.ok) {
        setEditingMember(null);
        showToast("会员课时与档案已成功保存", "success");
        fetchData();
      } else {
        showToast("保存会员信息失败，请稍后重试", "error");
      }
    } catch {
      showToast("网络请求异常", "error");
    } finally {
      setSavingMember(false);
    }
  };

  // 保存导师亲笔回音
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
        showToast("导师手札回音已保存并同步学员端", "success");
        fetchData();
      } else {
        showToast("回音保存失败", "error");
      }
    } catch {
      showToast("请求异常", "error");
    } finally {
      setSavingReply(false);
    }
  };

  // 录入新学员体感手札
  const handleCreateFeeling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeelingMemberId || !newFeelingText.trim()) {
      showToast("请选择学员并输入体感手札正文", "warning");
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
        showToast("学员体感手札录入成功", "success");
        fetchData();
      } else {
        showToast("录入失败，请检查参数", "error");
      }
    } catch {
      showToast("网络请求失败", "error");
    } finally {
      setSavingNewFeeling(false);
    }
  };

  // 实时过滤会员列表
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const code = (m.memberCode || `LW${String(m.id).padStart(3, "0")}`).toLowerCase();
    const name = (m.name || "").toLowerCase();
    const phone = (m.phone || "").toLowerCase();
    const mentor = (m.mentorName || "").toLowerCase();
    return code.includes(q) || name.includes(q) || phone.includes(q) || mentor.includes(q);
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* 头部导航与标题 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#697180", marginBottom: 4 }}>
            小程序对应页面 / 4. 我的账户 · 会员档案与课时资产
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#292D35",
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            我的账户 · 会员档案与手札
          </h1>
          <p style={{ fontSize: 13, color: "#697180", marginTop: 4, margin: 0 }}>
            实时管理 280 位在籍会员的基础档案、细分课时资产及课后心声手札，修改后即时同步至学员端。
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {activeTab === "feelings" && (
            <button
              type="button"
              onClick={() => setShowAddFeeling(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#2563EB",
                color: "#FFFFFF",
                padding: "8px 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={15} />
              <span>录入学员体感手札</span>
            </button>
          )}
        </div>
      </div>

      {/* 板块切换 Tab 栏 + 视图模式切换 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #E1E5EB",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "members" ? "2px solid #2563EB" : "2px solid transparent",
              color: activeTab === "members" ? "#2563EB" : "#697180",
              fontWeight: activeTab === "members" ? 600 : 400,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            在籍会员名录 ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("feelings")}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "feelings" ? "2px solid #2563EB" : "2px solid transparent",
              color: activeTab === "feelings" ? "#2563EB" : "#697180",
              fontWeight: activeTab === "feelings" ? 600 : 400,
              fontSize: 13.5,
              cursor: "pointer",
            }}
          >
            学员体感手札与回音 ({feelings.length})
          </button>
        </div>

        {activeTab === "members" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setShowAddMember(true);
              setCreatedCred(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              border: "none",
              background: "#2563EB",
              color: "#FFFFFF",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <UserPlus size={14} />
            <span>新增会员</span>
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "#FFFFFF",
              border: "1px solid #E1E5EB",
              borderRadius: 6,
              padding: 2,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="表格视图"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                border: "none",
                borderRadius: 4,
                background: viewMode === "table" ? "#E8EEFF" : "transparent",
                color: viewMode === "table" ? "#2563EB" : "#697180",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <TableIcon size={14} />
              <span>表格</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="卡片视图 (适合 iPad 触屏)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                border: "none",
                borderRadius: 4,
                background: viewMode === "grid" ? "#E8EEFF" : "transparent",
                color: viewMode === "grid" ? "#2563EB" : "#697180",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <LayoutGrid size={14} />
              <span>卡片</span>
            </button>
          </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#697180", fontSize: 13 }}>
          正在加载会员档案数据...
        </div>
      ) : activeTab === "members" ? (
        <div>
          {/* 实时搜索与统计工具条 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                minWidth: 280,
                maxWidth: 440,
              }}
            >
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#697180",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索会员编号（如 LW001）、姓名或导师..."
                style={{
                  width: "100%",
                  height: 36,
                  padding: "0 34px 0 34px",
                  borderRadius: 6,
                  border: "1px solid #E1E5EB",
                  fontSize: 13,
                  background: "#FFFFFF",
                  outline: "none",
                  color: "#292D35",
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#697180",
                    padding: 2,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ fontSize: 12.5, color: "#697180" }}>
              {searchQuery.trim() ? (
                <span>
                  筛选结果：共找到 <b style={{ color: "#2563EB" }}>{filteredMembers.length}</b> 位会员（总名录 {members.length} 人）
                </span>
              ) : (
                <span>
                  共 <b style={{ color: "#292D35" }}>{members.length}</b> 位在籍会员
                </span>
              )}
            </div>
          </div>

          {/* 表格视图 (Table View) */}
          {viewMode === "table" ? (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 8,
                border: "1px solid #E1E5EB",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#F5F7FA",
                      borderBottom: "1px solid #E1E5EB",
                      color: "#697180",
                    }}
                  >
                    <th style={{ padding: "12px 16px", fontWeight: 500 }}>会员编号</th>
                    <th style={{ padding: "12px 16px", fontWeight: 500 }}>姓名</th>
                    <th style={{ padding: "12px 16px", fontWeight: 500 }}>专属导师</th>
                    <th style={{ padding: "12px 16px", fontWeight: 500 }}>累计课时</th>
                    <th style={{ padding: "12px 16px", fontWeight: 500 }}>四类细分课时（学员端展示）</th>
                    <th style={{ padding: "12px 16px", fontWeight: 500 }}>入会日期</th>
                    <th style={{ padding: "12px 16px", fontWeight: 500, textAlign: "right" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const totalCalculated =
                      (m.hoursPilates || 0) +
                      (m.hoursEquipment || 0) +
                      (m.hoursFatBurn || 0) +
                      (m.hoursPrivate || 0);

                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: "1px solid #F5F7FA",
                          transition: "background 0.1s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                      >
                        {/* 编号 */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontFamily: "ui-monospace, monospace",
                              fontSize: 12,
                              color: "#2563EB",
                              background: "#E8EEFF",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 500,
                            }}
                          >
                            {m.memberCode || `LW${String(m.id).padStart(3, "0")}`}
                          </span>
                        </td>

                        {/* 姓名 */}
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#292D35" }}>
                          {m.name}
                          {m.phone && (
                            <span style={{ fontSize: 12, color: "#697180", fontWeight: 400, marginLeft: 6 }}>
                              ({m.phone})
                            </span>
                          )}
                        </td>

                        {/* 专属导师 */}
                        <td style={{ padding: "12px 16px", color: "#697180" }}>
                          {m.mentorName || "导师 小桥"}
                        </td>

                        {/* 累计课时 */}
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#292D35" }}>
                          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14 }}>
                            {totalCalculated || m.totalHours || "0"}
                          </span>{" "}
                          <span style={{ fontSize: 11, color: "#697180", fontWeight: 400 }}>节</span>
                        </td>

                        {/* 四类细分课时 */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
                            <span style={{ background: "#F5F7FA", border: "1px solid #E1E5EB", padding: "1px 6px", borderRadius: 4, color: "#292D35" }}>
                              普拉提: {m.hoursPilates ?? 0}
                            </span>
                            <span style={{ background: "#F5F7FA", border: "1px solid #E1E5EB", padding: "1px 6px", borderRadius: 4, color: "#292D35" }}>
                              大器械: {m.hoursEquipment ?? 0}
                            </span>
                            <span style={{ background: "#F5F7FA", border: "1px solid #E1E5EB", padding: "1px 6px", borderRadius: 4, color: "#292D35" }}>
                              超模班: {m.hoursFatBurn ?? 0}
                            </span>
                            <span style={{ background: "#F5F7FA", border: "1px solid #E1E5EB", padding: "1px 6px", borderRadius: 4, color: "#292D35" }}>
                              私教: {m.hoursPrivate ?? 0}
                            </span>
                          </div>
                        </td>

                        {/* 入会时间 */}
                        <td style={{ padding: "12px 16px", color: "#697180", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                          {m.joinedAt ? m.joinedAt.slice(0, 10) : "待录入"}
                        </td>

                        {/* 操作 */}
                        <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setEditingMember(m)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 8px",
                                background: "#E8EEFF",
                                color: "#2563EB",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              <Edit3 size={13} />
                              <span>修改课时</span>
                            </button>
                            <Link
                              href={`/admin/transformation?memberId=${m.id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 8px",
                                background: "#F5F7FA",
                                border: "1px solid #E1E5EB",
                                color: "#292D35",
                                borderRadius: 4,
                                fontSize: 12,
                                textDecoration: "none",
                              }}
                            >
                              <TrendingUp size={13} />
                              <span>体态</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "#697180" }}>
                        未找到包含 &quot;{searchQuery}&quot; 的在籍会员
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* 卡片视图 (Card Grid View - 适合 iPad 触屏) */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {filteredMembers.map((m) => {
                const total =
                  (m.hoursPilates || 0) +
                  (m.hoursEquipment || 0) +
                  (m.hoursFatBurn || 0) +
                  (m.hoursPrivate || 0);

                return (
                  <div
                    key={m.id}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 8,
                      border: "1px solid #E1E5EB",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontFamily: "ui-monospace, monospace",
                            fontWeight: 600,
                            color: "#2563EB",
                            background: "#E8EEFF",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {m.memberCode || `LW${String(m.id).padStart(3, "0")}`}
                        </span>
                        <span style={{ fontSize: 12, color: "#697180" }}>
                          入会：{m.joinedAt ? m.joinedAt.slice(0, 10) : "待录入"}
                        </span>
                      </div>

                      <div style={{ fontSize: 16, fontWeight: 600, color: "#292D35", marginBottom: 4 }}>
                        {m.name}
                        {m.phone && (
                          <span style={{ fontSize: 12, color: "#697180", fontWeight: 400, marginLeft: 8 }}>
                            {m.phone}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 12, color: "#697180", marginBottom: 12 }}>
                        专属导师：{m.mentorName || "导师 小桥"}
                      </div>

                      <div
                        style={{
                          background: "#F5F7FA",
                          padding: "8px 10px",
                          borderRadius: 6,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#697180" }}>累计课时</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#292D35", fontFamily: "ui-monospace, monospace" }}>
                          {total || m.totalHours || 0} <span style={{ fontSize: 11, fontWeight: 400, color: "#697180" }}>节</span>
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11.5, color: "#697180" }}>
                        <div>普拉提: <b style={{ color: "#292D35" }}>{m.hoursPilates ?? 0}</b></div>
                        <div>大器械: <b style={{ color: "#292D35" }}>{m.hoursEquipment ?? 0}</b></div>
                        <div>超模班: <b style={{ color: "#292D35" }}>{m.hoursFatBurn ?? 0}</b></div>
                        <div>私教课: <b style={{ color: "#292D35" }}>{m.hoursPrivate ?? 0}</b></div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #E1E5EB" }}>
                      <button
                        type="button"
                        onClick={() => setEditingMember(m)}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: 4,
                          background: "#E8EEFF",
                          color: "#2563EB",
                          border: "none",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        修改课时
                      </button>
                      <Link
                        href={`/admin/transformation?memberId=${m.id}`}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: 4,
                          background: "#F5F7FA",
                          border: "1px solid #E1E5EB",
                          color: "#292D35",
                          textAlign: "center",
                          fontSize: 12,
                          textDecoration: "none",
                        }}
                      >
                        体态档案
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 手札与回音信箱列表 */
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {feelings.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                padding: 48,
                textAlign: "center",
                color: "#697180",
                borderRadius: 8,
                border: "1px dashed #E1E5EB",
                fontSize: 13,
              }}
            >
              暂无学员课后留言便签
            </div>
          ) : (
            feelings.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 8,
                  border: "1px solid #E1E5EB",
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "#292D35" }}>
                      {f.member_name}
                    </span>
                    <span style={{ fontSize: 11, color: "#697180", fontFamily: "ui-monospace, monospace" }}>
                      {f.created_at?.slice(0, 16)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingItem(f);
                      setReplyText(f.xiaoqiao_reply || "");
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: "#E8EEFF",
                      color: "#2563EB",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {f.xiaoqiao_reply ? "修改回音" : "写导师回音"}
                  </button>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#292D35",
                    background: "#F5F7FA",
                    padding: "10px 14px",
                    borderRadius: 6,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: "#697180", fontWeight: 500 }}>学员原留言：</span>
                  “{f.feeling}”
                </div>

                {f.xiaoqiao_reply && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "#2563EB",
                      background: "#FFFFFF",
                      border: "1px solid #E8EEFF",
                      padding: "10px 14px",
                      borderRadius: 6,
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>导师回音：</span>
                    {f.xiaoqiao_reply}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── 侧滑抽屉 1：修改会员课时与档案 (Slide-over Drawer) ─── */}
      {editingMember && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(41, 45, 53, 0.4)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#FFFFFF",
              height: "100%",
              padding: "24px 28px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "-8px 0 24px rgba(41, 45, 53, 0.08)",
              animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#292D35" }}>
                    编辑会员档案与课时
                  </h3>
                  <div style={{ fontSize: 12, color: "#697180", marginTop: 2 }}>
                    学员：{editingMember.name} ({editingMember.memberCode})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#697180",
                    padding: 4,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveMember} id="member-edit-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    会员姓名
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMember.name || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    会员编号 (如 LW001)
                  </label>
                  <input
                    type="text"
                    value={editingMember.memberCode || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, memberCode: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", fontFamily: "ui-monospace, monospace" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    专属导师
                  </label>
                  <input
                    type="text"
                    value={editingMember.mentorName || "导师 小桥"}
                    onChange={(e) => setEditingMember({ ...editingMember, mentorName: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    入会日期 (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    value={editingMember.joinedAt ? editingMember.joinedAt.slice(0, 10) : ""}
                    onChange={(e) => setEditingMember({ ...editingMember, joinedAt: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    登录 PIN（无手机号会员的第二因子）
                  </label>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #E1E5EB",
                      background: "#F8FAFC",
                      fontSize: 13,
                      letterSpacing: 2,
                      color: "#292D35",
                      fontFamily: "ui-monospace, monospace",
                      minHeight: 35,
                      boxSizing: "border-box",
                    }}
                  >
                    {(editingMember as any).loginPin || "该会员使用手机尾号验证"}
                  </div>
                </div>

                {/* 四类细分课时核销调整 */}
                <div style={{ background: "#F5F7FA", padding: 12, borderRadius: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#292D35", marginBottom: 8 }}>
                    四类细分课时资产 (节)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#697180", marginBottom: 2 }}>普拉提垫上</label>
                      <input
                        type="number"
                        value={editingMember.hoursPilates ?? ""}
                        onChange={(e) => setEditingMember({ ...editingMember, hoursPilates: Number(e.target.value) })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#697180", marginBottom: 2 }}>大器械床</label>
                      <input
                        type="number"
                        value={editingMember.hoursEquipment ?? ""}
                        onChange={(e) => setEditingMember({ ...editingMember, hoursEquipment: Number(e.target.value) })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#697180", marginBottom: 2 }}>维密塑形超模班</label>
                      <input
                        type="number"
                        value={editingMember.hoursFatBurn ?? ""}
                        onChange={(e) => setEditingMember({ ...editingMember, hoursFatBurn: Number(e.target.value) })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, color: "#697180", marginBottom: 2 }}>私教 1对1</label>
                      <input
                        type="number"
                        value={editingMember.hoursPrivate ?? ""}
                        onChange={(e) => setEditingMember({ ...editingMember, hoursPrivate: Number(e.target.value) })}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#2563EB", fontWeight: 500, textAlign: "right" }}>
                    核销后总计：
                    {(editingMember.hoursPilates || 0) +
                      (editingMember.hoursEquipment || 0) +
                      (editingMember.hoursFatBurn || 0) +
                      (editingMember.hoursPrivate || 0)}{" "}
                    节
                  </div>
                </div>
              </form>
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #E1E5EB" }}>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 6,
                  border: "1px solid #E1E5EB",
                  background: "#F5F7FA",
                  color: "#697180",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                type="submit"
                form="member-edit-form"
                disabled={savingMember}
                style={{
                  flex: 2,
                  padding: "9px 0",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {savingMember ? "保存中..." : "确认保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 侧滑抽屉 2：回复导师手札回音 ─── */}
      {replyingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(41, 45, 53, 0.4)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#FFFFFF",
              height: "100%",
              padding: "24px 28px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "-8px 0 24px rgba(41, 45, 53, 0.08)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#292D35" }}>
                  导师亲笔回音 · {replyingItem.member_name}
                </h3>
                <button
                  type="button"
                  onClick={() => setReplyingItem(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#697180", padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: "#F5F7FA", padding: 12, borderRadius: 6, fontSize: 13, color: "#292D35", marginBottom: 16, lineHeight: 1.5 }}>
                <span style={{ color: "#697180", fontWeight: 500 }}>学员原留言：</span>
                “{replyingItem.feeling}”
              </div>

              <form onSubmit={handleSendReply} id="reply-form">
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>
                  导师亲笔回音内容
                </label>
                <textarea
                  rows={6}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="写下温暖真诚的专业点评与鼓励..."
                  style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, lineHeight: 1.5, boxSizing: "border-box", outline: "none" }}
                />
              </form>
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #E1E5EB" }}>
              <button
                type="button"
                onClick={() => setReplyingItem(null)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E1E5EB", background: "#F5F7FA", color: "#697180", fontSize: 13, cursor: "pointer" }}
              >
                取消
              </button>
              <button
                type="submit"
                form="reply-form"
                disabled={savingReply}
                style={{ flex: 2, padding: "9px 0", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                {savingReply ? "保存中..." : "保存回音"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 侧滑抽屉 3：录入学员体感手札 ─── */}
      {showAddFeeling && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(41, 45, 53, 0.4)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#FFFFFF",
              height: "100%",
              padding: "24px 28px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "-8px 0 24px rgba(41, 45, 53, 0.08)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#292D35" }}>
                  录入真实学员体感手札
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddFeeling(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#697180", padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateFeeling} id="add-feeling-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    选择所属学员
                  </label>
                  <input
                    type="text"
                    placeholder="输入编号或姓名快速过滤..."
                    value={newFeelingFilter}
                    onChange={(e) => setNewFeelingFilter(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 12.5, marginBottom: 6, boxSizing: "border-box" }}
                  />
                  <select
                    value={newFeelingMemberId}
                    onChange={(e) => setNewFeelingMemberId(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box" }}
                  >
                    {members
                      .filter((m) => {
                        if (!newFeelingFilter.trim()) return true;
                        const q = newFeelingFilter.trim().toLowerCase();
                        const code = (m.memberCode || `LW${m.id}`).toLowerCase();
                        const name = (m.name || "").toLowerCase();
                        return code.includes(q) || name.includes(q);
                      })
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.memberCode || `LW${m.id}`})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    学员真实课后体感描述
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newFeelingText}
                    onChange={(e) => setNewFeelingText(e.target.value)}
                    placeholder="例如：练习两周普拉提大器械后，明显感觉肋骨内收、呼吸顺畅，肩膀自然下沉..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 4 }}>
                    导师亲笔手札回音 (可选)
                  </label>
                  <textarea
                    rows={4}
                    value={newFeelingReply}
                    onChange={(e) => setNewFeelingReply(e.target.value)}
                    placeholder="给予专业动作机制解释与鼓励..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, lineHeight: 1.5, boxSizing: "border-box" }}
                  />
                </div>
              </form>
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #E1E5EB" }}>
              <button
                type="button"
                onClick={() => setShowAddFeeling(false)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E1E5EB", background: "#F5F7FA", color: "#697180", fontSize: 13, cursor: "pointer" }}
              >
                取消
              </button>
              <button
                type="submit"
                form="add-feeling-form"
                disabled={savingNewFeeling}
                style={{ flex: 2, padding: "9px 0", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
              >
                {savingNewFeeling ? "录入中..." : "确认录入"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 侧滑抽屉 3：新增会员 ─── */}
      {showAddMember && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(41, 45, 53, 0.4)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#FFFFFF",
              height: "100%",
              padding: "24px 28px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "-8px 0 24px rgba(41, 45, 53, 0.08)",
              overflowY: "auto",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#292D35" }}>新增会员</h3>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#697180", padding: 4 }}
                >
                  <X size={18} />
                </button>
              </div>
              <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#697180", lineHeight: 1.6 }}>
                保存后系统会自动生成邀请码与登录 PIN，会员用这两个就能在小程序登录。开卡请到「会员卡」页面办理。
              </p>

              {createdCred ? (
                <div>
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#065F46", marginBottom: 10 }}>
                      {createdCred.name} 已创建，登录凭据如下
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px dashed #A7F3D0" }}>
                      <span style={{ fontSize: 13, color: "#065F46" }}>邀请码</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <b style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, color: "#065F46" }}>{createdCred.portalCode}</b>
                        <button type="button" onClick={() => copyCred(createdCred.portalCode, "邀请码")} style={{ border: "1px solid #A7F3D0", background: "#FFFFFF", color: "#065F46", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>复制</button>
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                      <span style={{ fontSize: 13, color: "#065F46" }}>登录 PIN</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <b style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, color: "#065F46" }}>{createdCred.loginPin}</b>
                        <button type="button" onClick={() => copyCred(createdCred.loginPin, "登录 PIN")} style={{ border: "1px solid #A7F3D0", background: "#FFFFFF", color: "#065F46", borderRadius: 4, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>复制</button>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreatedCred(null)}
                    style={{ width: "100%", padding: "9px 0", borderRadius: 6, border: "1px dashed #C7D2FE", background: "#F5F7FA", color: "#2563EB", fontSize: 13, cursor: "pointer", marginBottom: 8 }}
                  >
                    再新增一位会员
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateMember} id="add-member-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>
                      姓名 <span style={{ color: "#DC2626" }}>必填</span>
                    </label>
                    <input
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="例如 张三"
                      style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>手机号</label>
                    <input
                      type="text"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      placeholder="没有手机号可留空，会员用登录 PIN 登录"
                      style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>性别</label>
                      <select
                        value={newMember.gender}
                        onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                        style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", background: "#FFFFFF" }}
                      >
                        <option value="">未填</option>
                        <option value="female">女</option>
                        <option value="male">男</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>生日</label>
                      <input
                        type="date"
                        value={newMember.birthday}
                        onChange={(e) => setNewMember({ ...newMember, birthday: e.target.value })}
                        style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", outline: "none" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>入会日期</label>
                      <input
                        type="date"
                        value={newMember.joinedAt}
                        onChange={(e) => setNewMember({ ...newMember, joinedAt: e.target.value })}
                        style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", outline: "none" }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>带教导师</label>
                      <input
                        type="text"
                        value={newMember.mentorName}
                        onChange={(e) => setNewMember({ ...newMember, mentorName: e.target.value })}
                        placeholder="例如 小桥"
                        style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", outline: "none" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#697180", marginBottom: 6 }}>备注</label>
                    <textarea
                      value={newMember.notes}
                      onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                      rows={3}
                      placeholder="身体情况、诉求、转介绍来源等，可留空"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #E1E5EB", fontSize: 13, boxSizing: "border-box", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                    />
                  </div>
                </form>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #E1E5EB" }}>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "1px solid #E1E5EB", background: "#F5F7FA", color: "#697180", fontSize: 13, cursor: "pointer" }}
              >
                {createdCred ? "完成" : "取消"}
              </button>
              {!createdCred && (
                <button
                  type="submit"
                  form="add-member-form"
                  disabled={savingNewMember}
                  style={{ flex: 2, padding: "9px 0", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                >
                  {savingNewMember ? "保存中..." : "保存并生成登录凭据"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
