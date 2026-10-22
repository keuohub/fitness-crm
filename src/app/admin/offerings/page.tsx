"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CourseOffering {
  id: number;
  num: string;
  name: string;
  enName: string;
  summary: string;
  target: string;
  highlight: string;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: number;
  createdAt: string;
}

export default function AdminOfferingsPage() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<CourseOffering> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchOfferings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offerings");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOfferings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setEditingItem((prev) => prev ? { ...prev, imageUrl: data.url } : null);
      } else {
        alert("上传失败");
      }
    } catch (err) {
      alert("上传出错");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.summary) {
      alert("请填写项目名称与核心概要！");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingItem.id;
      const res = await fetch("/api/admin/offerings", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchOfferings();
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
    if (!confirm("确定要删除该课程类目吗？")) return;
    try {
      const res = await fetch(`/api/admin/offerings?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchOfferings();
      } else {
        alert("删除失败");
      }
    } catch (err) {
      alert("网络请求失败");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      {/* 头部导航与操作 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 13, color: "#8B5E3C", textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            ← 返回管理总览
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>
            ✨ 第 2 板块：了解徕舞 · 课程项目类目管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 6, margin: 0 }}>
            对应微信小程序「了解徕舞」第三大模块。5大专属训练类目后台随时改、前台即时同步
          </p>
        </div>
        <button
          onClick={() =>
            setEditingItem({
              num: `0${offerings.length + 1}`,
              name: "",
              enName: "",
              summary: "",
              target: "",
              highlight: "",
              sortOrder: offerings.length + 1,
              isActive: 1,
            })
          }
          style={{
            background: "#5E1914",
            color: "#FFFFFF",
            border: "none",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(94,25,20,0.25)",
          }}
        >
          ＋ 新增课程类目
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9E9E9E" }}>加载中...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {offerings.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                border: "1px solid #EBE4DF",
                padding: 24,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 24,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span
                    style={{
                      background: "#5E1914",
                      color: "#FFFFFF",
                      fontFamily: "serif",
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 4,
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.num}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1C1415" }}>{item.name}</h3>
                  <span style={{ fontSize: 12, color: "#A39793", letterSpacing: 1, fontWeight: 600 }}>{item.enName}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontWeight: 500,
                      background: item.isActive === 1 ? "rgba(46, 125, 50, 0.1)" : "rgba(100, 100, 100, 0.1)",
                      color: item.isActive === 1 ? "#2E7D32" : "#757575",
                    }}
                  >
                    {item.isActive === 1 ? "展示中" : "已下线"}
                  </span>
                </div>

                {/* 核心概要 */}
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: "#F8F4F0",
                    borderLeft: "3px solid #8B5E3C",
                    borderRadius: "0 6px 6px 0",
                    fontSize: 13,
                    color: "#5E1914",
                    fontWeight: 500,
                    marginBottom: 14,
                  }}
                >
                  {item.summary}
                </div>

                {/* 详细人群与重点 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "#FAF7F5", padding: 14, borderRadius: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#8B5E3C", fontWeight: 600, display: "block", marginBottom: 4 }}>适合人群：</span>
                    <span style={{ color: "#4A403E", lineHeight: 1.5 }}>{item.target}</span>
                  </div>
                  <div>
                    <span style={{ color: "#5E1914", fontWeight: 600, display: "block", marginBottom: 4 }}>训练重点：</span>
                    <span style={{ color: "#4A403E", lineHeight: 1.5 }}>{item.highlight}</span>
                  </div>
                </div>

                {item.imageUrl && (
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: 100, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #E0D7D0" }}
                    />
                    <span style={{ fontSize: 12, color: "#8C827B" }}>卡片专属背景底图</span>
                  </div>
                )}
              </div>

              {/* 右侧动作 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 90 }}>
                <span style={{ fontSize: 12, color: "#8C827B", textAlign: "right" }}>排序权重: {item.sortOrder}</span>
                <button
                  onClick={() => setEditingItem(item)}
                  style={{
                    padding: "8px 16px",
                    background: "#FAF7F5",
                    border: "1px solid #E2D9D2",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#5E1914",
                    fontWeight: 500,
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    padding: "8px 16px",
                    background: "#FFF5F5",
                    border: "1px solid #FFCDD2",
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#C62828",
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑/新增弹窗 */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              width: 540,
              maxWidth: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#1C1415" }}>
              {editingItem.id ? "编辑课程类目" : "新增课程类目"}
            </h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 100 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    类目编号 <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：01"
                    value={editingItem.num || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, num: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    类目中文名称 <span style={{ color: "#C62828" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：精选普拉提 / 高定大器械"
                    value={editingItem.name || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  英文名称 / 标示
                </label>
                <input
                  type="text"
                  placeholder="如：CURATED PILATES"
                  value={editingItem.enName || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, enName: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  核心概要 (展示在气泡条中) <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：垫上核心激活 · 呼吸模式调整 · 脊柱逐节灵动"
                  value={editingItem.summary || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  适合人群描述
                </label>
                <textarea
                  rows={2}
                  placeholder="如：久坐办公肩颈紧绷、初次接触普拉提、需要建立身体深层觉知的练习者。"
                  value={editingItem.target || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, target: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  训练重点与特色
                </label>
                <textarea
                  rows={3}
                  placeholder="如：利用滑行台与各级阻力弹簧，在不稳定支撑面中激活深层肌群，强化核心抗旋转与抗伸展能力。"
                  value={editingItem.highlight || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, highlight: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  卡片背景底图 (小程序端置于文字下方，高雅衬底)
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="/images/offerings/offering-pilates.png 或图片地址"
                    value={editingItem.imageUrl || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                  <label style={{
                    padding: "10px 14px", background: "#F5ECE5", color: "#5E1914",
                    borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
                  }}>
                    {uploading ? "上传中..." : "本地上传"}
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </div>
                {editingItem.imageUrl && (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={editingItem.imageUrl}
                      alt="底图预览"
                      style={{ width: 120, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #D1C7C1" }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    排序权重
                  </label>
                  <input
                    type="number"
                    value={editingItem.sortOrder ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, sortOrder: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    展示状态
                  </label>
                  <select
                    value={editingItem.isActive ?? 1}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  >
                    <option value={1}>上线展示</option>
                    <option value={0}>隐藏下线</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{ padding: "10px 20px", background: "#F5F5F5", border: "1px solid #DDD", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 24px",
                    background: "#5E1914",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
