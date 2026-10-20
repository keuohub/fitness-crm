"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MonthlyStar {
  id: number;
  name: string;
  avatarUrl: string;
  tag: string | null;
  quote: string | null;
  sortOrder: number;
  isActive: number;
  createdAt: string;
}

export default function AdminStarsPage() {
  const [stars, setStars] = useState<MonthlyStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStar, setEditingStar] = useState<Partial<MonthlyStar> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchStars = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stars");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStars(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStars();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStar?.name || !editingStar?.avatarUrl) {
      alert("请填写姓名并上传或填入写真照片！");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingStar.id;
      const res = await fetch("/api/admin/stars", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStar),
      });
      if (res.ok) {
        setEditingStar(null);
        fetchStars();
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
    if (!confirm("确定要删除该月度之星吗？")) return;
    try {
      const res = await fetch(`/api/admin/stars?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchStars();
      } else {
        alert("删除失败");
      }
    } catch (err) {
      alert("网络请求失败");
    }
  };

  const handleToggleActive = async (star: MonthlyStar) => {
    try {
      const res = await fetch("/api/admin/stars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: star.id, isActive: star.isActive === 1 ? 0 : 1 }),
      });
      if (res.ok) {
        fetchStars();
      }
    } catch (err) {
      console.error(err);
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
        setEditingStar((prev) => ({ ...prev, avatarUrl: data.url }));
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
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#1C1415", margin: 0 }}>
            ✦ 徕舞 · 月度之星管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 6, margin: 0 }}>
            自主录入或替换开屏画廊大片，随时调整展示顺序与上线状态（不受周期限制，随心更换）
          </p>
        </div>
        <button
          onClick={() => setEditingStar({ name: "", avatarUrl: "", tag: "", quote: "", sortOrder: stars.length + 1, isActive: 1 })}
          style={{
            background: "#5E1914", color: "#FFFFFF", border: "none", padding: "12px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 8px rgba(94,25,20,0.25)"
          }}
        >
          ＋ 新增月度之星
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9E9E9E" }}>加载中...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {stars.map((star) => (
            <div
              key={star.id}
              style={{
                background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBE4DF", overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column"
              }}
            >
              <div style={{ position: "relative", width: "100%", height: 320, background: "#2C1B1D" }}>
                <img
                  src={star.avatarUrl}
                  alt={star.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", top: 12, right: 12,
                  background: star.isActive === 1 ? "rgba(46, 125, 50, 0.9)" : "rgba(100, 100, 100, 0.9)",
                  color: "#FFFFFF", fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500
                }}>
                  {star.isActive === 1 ? "展示中" : "已隐藏"}
                </div>
                {star.tag && (
                  <div style={{
                    position: "absolute", bottom: 12, left: 12,
                    background: "rgba(212, 175, 55, 0.95)", color: "#1C1415",
                    fontSize: 12, padding: "4px 10px", borderRadius: 4, fontWeight: 600, letterSpacing: 1
                  }}>
                    ✦ {star.tag}
                  </div>
                )}
              </div>

              <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 600, color: "#1C1415" }}>{star.name}</h3>
                    <span style={{ fontSize: 12, color: "#8B5E3C" }}>排序: {star.sortOrder}</span>
                  </div>
                  <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#665E5C", lineHeight: 1.5, fontStyle: "italic" }}>
                    {star.quote ? `“${star.quote}”` : "（未填写心语）"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 18, borderTop: "1px solid #F0EAE6", paddingTop: 12 }}>
                  <button
                    onClick={() => handleToggleActive(star)}
                    style={{
                      flex: 1, padding: "8px 0", background: "#FAF7F5", border: "1px solid #E2D9D2",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#4A403E"
                    }}
                  >
                    {star.isActive === 1 ? "隐藏" : "上线"}
                  </button>
                  <button
                    onClick={() => setEditingStar(star)}
                    style={{
                      flex: 1, padding: "8px 0", background: "#FAF7F5", border: "1px solid #E2D9D2",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#5E1914", fontWeight: 500
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(star.id)}
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
      {editingStar && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: 480, maxWidth: "90%", padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#1C1415" }}>
              {editingStar.id ? "编辑月度之星" : "新增月度之星"}
            </h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  会员姓名 / 昵称 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：苏晴"
                  value={editingStar.name || ""}
                  onChange={(e) => setEditingStar({ ...editingStar, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  写真大片 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    placeholder="/brand/stars/star-1.jpg 或图片网络地址"
                    value={editingStar.avatarUrl || ""}
                    onChange={(e) => setEditingStar({ ...editingStar, avatarUrl: e.target.value })}
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

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  克制标签 (2~4字，自选填)
                </label>
                <input
                  type="text"
                  placeholder="如：从容、深耕、专注、觉知、自在"
                  value={editingStar.tag || ""}
                  onChange={(e) => setEditingStar({ ...editingStar, tag: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  自律心语 / 寄语 (真实短句，选填)
                </label>
                <textarea
                  rows={3}
                  placeholder="如：在呼吸的节律里，重新找回身体原本的力量。"
                  value={editingStar.quote || ""}
                  onChange={(e) => setEditingStar({ ...editingStar, quote: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    排序权重 (数字越小越靠前)
                  </label>
                  <input
                    type="number"
                    value={editingStar.sortOrder ?? 0}
                    onChange={(e) => setEditingStar({ ...editingStar, sortOrder: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    展示状态
                  </label>
                  <select
                    value={editingStar.isActive ?? 1}
                    onChange={(e) => setEditingStar({ ...editingStar, isActive: Number(e.target.value) })}
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
                  onClick={() => setEditingStar(null)}
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
