"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface VenueItem {
  id: number;
  title: string;
  imageUrl: string;
  sortOrder: number;
  isActive: number;
  createdAt: string;
}

export default function AdminVenuePage() {
  const [items, setItems] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<VenueItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/venue");
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title || !editingItem?.imageUrl) {
      alert("请填写空间标题并上传或填入照片！");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingItem.id;
      const res = await fetch("/api/admin/venue", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      if (res.ok) {
        setEditingItem(null);
        fetchItems();
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
    if (!confirm("确定要删除该空间图片吗？")) return;
    try {
      const res = await fetch(`/api/admin/venue?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchItems();
      } else {
        alert("删除失败");
      }
    } catch (err) {
      alert("网络请求失败");
    }
  };

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
      const data = await res.json();
      if (data.url) {
        setEditingItem((prev) => ({ ...prev, imageUrl: data.url }));
      } else {
        alert(data.error || "图片上传失败");
      }
    } catch (err) {
      alert("图片上传异常");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 13, color: "#8B5E3C", textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            ← 返回管理总览
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>
            🏛️ 第 2 板块：了解徕舞 · 场馆空间管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 6, margin: 0 }}>
            管理小程序主框架展示的场馆实景与器械大片，留纯净标题框架供后台随心撰写
          </p>
        </div>
        <button
          onClick={() => setEditingItem({ title: "", imageUrl: "", sortOrder: items.length + 1, isActive: 1 })}
          style={{
            background: "#5E1914", color: "#FFFFFF", border: "none", padding: "12px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 8px rgba(94,25,20,0.25)"
          }}
        >
          ＋ 上传新空间图片
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9E9E9E" }}>加载中...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBE4DF", overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column"
              }}
            >
              <div style={{ position: "relative", width: "100%", height: 200, background: "#2C1B1D" }}>
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: item.isActive === 1 ? "rgba(46, 125, 50, 0.9)" : "rgba(100, 100, 100, 0.9)",
                  color: "#FFFFFF", fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500
                }}>
                  {item.isActive === 1 ? "展示中" : "已隐藏"}
                </div>
              </div>

              <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 600, color: "#1C1415" }}>{item.title}</h3>
                  <span style={{ fontSize: 12, color: "#8B5E3C" }}>排序权重: {item.sortOrder}</span>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16, borderTop: "1px solid #F0EAE6", paddingTop: 10 }}>
                  <button
                    onClick={() => setEditingItem(item)}
                    style={{
                      flex: 1, padding: "8px 0", background: "#FAF7F5", border: "1px solid #E2D9D2",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#5E1914", fontWeight: 500
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      padding: "8px 12px", background: "#FFF5F5", border: "1px solid #FFCDD2",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#C62828"
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑/新增弹窗 */}
      {editingItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: 440, maxWidth: "90%", padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#1C1415" }}>
              {editingItem.id ? "编辑空间图片" : "上传空间图片"}
            </h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  空间标题 / 编号 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：01 / 核心床私密舱"
                  value={editingItem.title || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  图片地址 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    placeholder="/brand/venue/venue-1.jpg 或图片地址"
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
                    padding: "10px 24px", background: "#5E1914", color: "#FFFFFF", border: "none",
                    borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer"
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
