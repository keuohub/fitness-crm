"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Member {
  id: number;
  name: string;
  phone: string | null;
  joinedAt: string | null;
}

interface PostureCompare {
  id: number;
  member_id: number;
  photo1_url: string;
  photo2_url: string;
  photo1_type: string;
  photo2_type: string;
  photo1_date: string;
  photo2_date: string;
  analysis: string;
  created_at: string;
}

export default function AdminTransformationPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [comparisons, setComparisons] = useState<PostureCompare[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<PostureCompare> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);

  // 1. 获取会员列表
  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMembers(data);
        // 优先选中 王芳 (id 90) 或首个会员
        const wf = data.find((m: any) => m.name === "王芳");
        const initId = wf ? wf.id : data[0].id;
        setSelectedMemberId(initId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. 获取该会员的体态对比记录
  const fetchComparisons = async (mid: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/photo-compare?memberId=${mid}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setComparisons(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchComparisons(selectedMemberId);
    }
  }, [selectedMemberId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !editingItem?.photo1_url || !editingItem?.photo2_url) {
      alert("请填写初测与进阶两张照片！");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingItem.id;
      const res = await fetch("/api/admin/photo-compare", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingItem,
          memberId: selectedMemberId,
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchComparisons(selectedMemberId);
      } else {
        const err = await res.json();
        alert(err.error || "保存失败");
      }
    } catch (err) {
      alert("网络请求失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除这条体态对比记录吗？")) return;
    try {
      const res = await fetch(`/api/admin/photo-compare?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok && selectedMemberId) {
        fetchComparisons(selectedMemberId);
      } else {
        alert("删除失败");
      }
    } catch (err) {
      alert("请求异常");
    }
  };

  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "photo1_url" | "photo2_url",
    setUploadState: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setEditingItem((prev) => ({ ...prev, [field]: data.url }));
      } else {
        alert(data.error || "上传失败");
      }
    } catch (err) {
      alert("上传网络异常");
    } finally {
      setUploadState(false);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      {/* 顶部标题区 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>
            👤 第 3 板块：我的蜕变 · 体态对比档案管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8, margin: 0, lineHeight: 1.5 }}>
            管理会员的<b>入学初测照</b>（FIG. 01）与<b>进阶定格照</b>（FIG. 02），支持<b>正面/侧面/背面</b>三维对比及<b>导师小桥亲笔体态诊断评语</b>。
            此处内容与首屏“徕舞之星”完全独立，专用于展示会员自身身形改变。
          </p>
        </div>
        <button
          onClick={() =>
            setEditingItem({
              photo1_type: "front",
              photo2_type: "front",
              photo1_date: "2025年10月20日 · 入学初评",
              photo2_date: "2026年10月18日 · 进阶定格",
              photo1_url: "/images/posture/posture_front_before.jpg",
              photo2_url: "/images/posture/posture_front_after.jpg",
              analysis:
                "经过 42 节普拉提与大器械精准训练，肋骨外翻已显著收紧归位；骨盆前倾改善约 6°，左右高低肩平衡对称，下颌线与双侧锁骨线条舒展挺拔。",
            })
          }
          style={{
            background: "#0E0D10", color: "#FFFFFF", border: "none", padding: "12px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(14,13,16,0.25)"
          }}
        >
          + 为该会员新增体态对比
        </button>
      </div>

      {/* 会员选择器条 */}
      <div
        style={{
          background: "#FFFFFF", padding: "16px 20px", borderRadius: 12,
          border: "1px solid #EBE4DF", marginBottom: 28, display: "flex",
          alignItems: "center", justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1415" }}>当前查看会员：</span>
          <select
            value={selectedMemberId || ""}
            onChange={(e) => setSelectedMemberId(Number(e.target.value))}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #D1C7C1",
              fontSize: 14, fontWeight: 500, background: "#FAF7F5", cursor: "pointer"
            }}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.phone ? `(${m.phone})` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedMember && (
          <div style={{ fontSize: 13, color: "#8C827B" }}>
            会员编号: <code style={{ color: "#1C1415", fontWeight: 600 }}>LW{selectedMember.id}</code> ·
            加入日期: {selectedMember.joinedAt ? selectedMember.joinedAt.slice(0, 10) : "2026-10-02"}
          </div>
        )}
      </div>

      {/* 对比记录卡片展示 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#8C827B" }}>加载体态对比档案中...</div>
      ) : comparisons.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF", borderRadius: 12, border: "1px dashed #D1C7C1",
            padding: "50px 20px", textAlign: "center"
          }}
        >
          <p style={{ fontSize: 15, color: "#1C1415", fontWeight: 600, margin: 0 }}>
            该会员目前使用临床标准体态评估网格图
          </p>
          <p style={{ fontSize: 13, color: "#8C827B", marginTop: 8 }}>
            点击右上角「+ 为该会员新增体态对比」，即可上传该会员实际的初测与进阶照片并写上导师评语。
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {comparisons.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#FFFFFF", borderRadius: 14, border: "1px solid #EBE4DF",
                padding: 24, boxShadow: "0 4px 14px rgba(0,0,0,0.03)"
              }}
            >
              {/* 头部：角度与日期 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      background: "#0E0D10", color: "#FFFFFF", fontSize: 12,
                      fontWeight: 600, padding: "4px 12px", borderRadius: 16
                    }}
                  >
                    {c.photo1_type === "side" ? "侧面体态观" : c.photo1_type === "back" ? "背面体态观" : "正面体态观"}
                  </span>
                  <span style={{ fontSize: 13, color: "#8C827B" }}>
                    对比周期：{c.photo1_date} VS {c.photo2_date}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setEditingItem(c)}
                    style={{
                      background: "#FAF7F5", border: "1px solid #D1C7C1", padding: "6px 14px",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#1C1415"
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{
                      background: "#FFEBEE", border: "1px solid #FFCDD2", padding: "6px 14px",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#C62828"
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* 双幅展陈照片对 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
                {/* 初测 */}
                <div>
                  <div style={{ fontSize: 12, color: "#8C827B", marginBottom: 8, fontWeight: 600 }}>
                    FIG. 01 入学初测
                  </div>
                  <div style={{ width: "100%", height: 320, background: "#F5F3F0", borderRadius: 8, overflow: "hidden" }}>
                    <img src={c.photo1_url} alt="初测" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>

                {/* 进阶 */}
                <div>
                  <div style={{ fontSize: 12, color: "#9E2A2B", marginBottom: 8, fontWeight: 600 }}>
                    FIG. 02 进阶定格
                  </div>
                  <div style={{ width: "100%", height: 320, background: "#F5F3F0", borderRadius: 8, overflow: "hidden" }}>
                    <img src={c.photo2_url} alt="进阶" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              </div>

              {/* 导师体态诊断 */}
              <div style={{ background: "#FAF7F5", borderRadius: 8, padding: "14px 18px", border: "1px solid #EBE4DF" }}>
                <div style={{ fontSize: 12, color: "#9E2A2B", fontWeight: 600, marginBottom: 4 }}>
                  印 导师小桥 · 体态诊断与进阶记录
                </div>
                <div style={{ fontSize: 13, color: "#4A403E", lineHeight: 1.6 }}>{c.analysis}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 弹窗编辑/新建 */}
      {editingItem && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999
          }}
        >
          <div
            style={{
              background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 640,
              maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#1C1415", fontWeight: 700 }}>
              {editingItem.id ? "编辑体态对比档案" : "新建体态对比档案"}
            </h2>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* 评测角度 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  评测角度
                </label>
                <select
                  value={editingItem.photo1_type || "front"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingItem({
                      ...editingItem,
                      photo1_type: val,
                      photo2_type: val,
                      photo1_url:
                        val === "side"
                          ? "/images/posture/posture_side_before.jpg"
                          : val === "back"
                          ? "/images/posture/posture_back_before.jpg"
                          : "/images/posture/posture_front_before.jpg",
                      photo2_url:
                        val === "side"
                          ? "/images/posture/posture_side_after.jpg"
                          : val === "back"
                          ? "/images/posture/posture_back_after.jpg"
                          : "/images/posture/posture_front_after.jpg",
                    });
                  }}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14 }}
                >
                  <option value="front">正面 (Front)</option>
                  <option value="side">侧面 (Side)</option>
                  <option value="back">背面 (Back)</option>
                </select>
              </div>

              {/* FIG. 01 初测照 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  FIG. 01 入学初测照 (支持上传真实照片或评估照)
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    value={editingItem.photo1_url || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, photo1_url: e.target.value })}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13 }}
                  />
                  <label
                    style={{
                      padding: "10px 16px", background: "#0E0D10", color: "#FFFFFF",
                      borderRadius: 8, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap"
                    }}
                  >
                    {uploading1 ? "上传中..." : "本地上传"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadPhoto(e, "photo1_url", setUploading1)}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
                {editingItem.photo1_url && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={editingItem.photo1_url} alt="预览" style={{ height: 60, borderRadius: 6, border: "1px solid #EBE4DF" }} />
                    <span style={{ fontSize: 12, color: "#2E7D32" }}>✓ 已加载预览</span>
                  </div>
                )}
              </div>

              {/* FIG. 02 进阶定格照 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  FIG. 02 进阶定格照 (支持上传真实照片或进阶照)
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    value={editingItem.photo2_url || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, photo2_url: e.target.value })}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13 }}
                  />
                  <label
                    style={{
                      padding: "10px 16px", background: "#0E0D10", color: "#FFFFFF",
                      borderRadius: 8, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap"
                    }}
                  >
                    {uploading2 ? "上传中..." : "本地上传"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadPhoto(e, "photo2_url", setUploading2)}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
                {editingItem.photo2_url && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={editingItem.photo2_url} alt="预览" style={{ height: 60, borderRadius: 6, border: "1px solid #EBE4DF" }} />
                    <span style={{ fontSize: 12, color: "#2E7D32" }}>✓ 已加载预览</span>
                  </div>
                )}
              </div>

              {/* 导师小桥评语 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  导师体态诊断与进阶记录
                </label>
                <textarea
                  rows={4}
                  value={editingItem.analysis || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, analysis: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13, lineHeight: 1.5 }}
                />
              </div>

              {/* 操作按钮 */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ padding: "10px 20px", background: "#FAF7F5", border: "1px solid #D1C7C1", borderRadius: 8, fontSize: 14, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 24px", background: "#0E0D10", color: "#FFFFFF",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  {saving ? "保存中..." : "保存体态档案"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
