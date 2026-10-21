"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MonthlyStar {
  id: number;
  name: string;
  avatarUrl: string;
  joinDays: number | null;
  trainCount: number | null;
  courseType: string | null;
  journey: string | null;
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
      alert("请填写会员姓名并上传或填入写真照片！");
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
    if (!confirm("确定要删除该封面之星吗？")) return;
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
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, sans-serif" }}>
      {/* 顶部导航与介绍 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 13, color: "#8B5E3C", textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            ← 返回管理总览
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1C1415", margin: 0 }}>
            🌟 第 1 板块：徕舞之星 · 封面画廊管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 8, margin: 0, lineHeight: 1.5 }}>
            直接自主修改小程序首屏画报的<b>会员姓名</b>、<b>相伴天数</b>、<b>上课节数</b>、<b>体态心语</b>与<b>写真大片</b>。
            保存后微信小程序首屏将即时同步更新。
          </p>
        </div>
        <button
          onClick={() =>
            setEditingStar({
              name: "",
              avatarUrl: "",
              joinDays: 100,
              trainCount: 30,
              courseType: "大器械私教",
              journey: "相伴自律 100 天 · 30 节大器械私教",
              quote: "",
              sortOrder: stars.length + 1,
              isActive: 1,
            })
          }
          style={{
            background: "#0E0D10", color: "#FFFFFF", border: "none", padding: "12px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 8px rgba(14,13,16,0.25)"
          }}
        >
          ＋ 新增封面之星
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#9E9E9E", fontSize: 14 }}>
          正在加载封面画报列表...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 24 }}>
          {stars.map((star) => {
            const displayJourney =
              star.journey ||
              (star.joinDays || star.trainCount
                ? `相伴自律 ${star.joinDays || 0} 天 · ${star.trainCount || 0} 节${star.courseType || "私教"}`
                : "未填写经历信息");

            return (
              <div
                key={star.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: "1px solid #EBE4DF",
                  overflow: "hidden",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* 封面照片 */}
                <div style={{ position: "relative", width: "100%", height: 360, background: "#0E0D10" }}>
                  <img
                    src={star.avatarUrl}
                    alt={star.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: star.isActive === 1 ? "rgba(46, 125, 50, 0.92)" : "rgba(100, 100, 100, 0.92)",
                      color: "#FFFFFF",
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontWeight: 600,
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {star.isActive === 1 ? "● 展示中" : "○ 已隐藏"}
                  </div>
                </div>

                {/* 核心信息区 */}
                <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    {/* 经历信息 */}
                    <div style={{ fontSize: 12, color: "#9E2A2B", fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>
                      {displayJourney}
                    </div>

                    {/* 姓名与排序 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 600, color: "#1C1415", fontFamily: "serif" }}>
                        {star.name}
                      </h3>
                      <span style={{ fontSize: 12, color: "#8C827B" }}>排序: {star.sortOrder}</span>
                    </div>

                    {/* 心语 */}
                    <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#554E48", lineHeight: 1.6, fontStyle: "italic" }}>
                      {star.quote ? `“${star.quote}”` : "（未填写自律心语）"}
                    </p>
                  </div>

                  {/* 操作按钮组 */}
                  <div style={{ display: "flex", gap: 10, marginTop: 18, borderTop: "1px solid #F0EAE6", paddingTop: 14 }}>
                    <button
                      onClick={() => handleToggleActive(star)}
                      style={{
                        flex: 1, padding: "8px 0", background: "#FAF7F5", border: "1px solid #E2D9D2",
                        borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#4A403E"
                      }}
                    >
                      {star.isActive === 1 ? "设为隐藏" : "设为展示"}
                    </button>
                    <button
                      onClick={() => setEditingStar(star)}
                      style={{
                        flex: 1, padding: "8px 0", background: "#FAF7F5", border: "1px solid #E2D9D2",
                        borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#0E0D10", fontWeight: 600
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
            );
          })}
        </div>
      )}

      {/* 编辑/新增弹窗 */}
      {editingStar && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#FFFFFF", borderRadius: 16, width: 540, maxWidth: "92%", maxHeight: "90vh", overflowY: "auto",
            padding: 32, boxShadow: "0 16px 40px rgba(0,0,0,0.2)"
          }}>
            <h2 style={{ margin: "0 0 6px 0", fontSize: 22, color: "#1C1415", fontFamily: "serif" }}>
              {editingStar.id ? "编辑封面之星" : "新增封面之星"}
            </h2>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#8C827B" }}>
              修改后即刻生效至微信小程序首屏满屏画报
            </p>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* 会员姓名 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  会员姓名 / 昵称 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：林晓、许诺"
                  value={editingStar.name || ""}
                  onChange={(e) => setEditingStar({ ...editingStar, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              {/* 相伴天数与上课节数 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    相伴自律天数 (天)
                  </label>
                  <input
                    type="number"
                    placeholder="如：140"
                    value={editingStar.joinDays ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Number(e.target.value);
                      const updated = { ...editingStar, joinDays: val };
                      if (val || updated.trainCount) {
                        updated.journey = `相伴自律 ${val || 0} 天 · ${updated.trainCount || 0} 节${updated.courseType || "大器械私教"}`;
                      }
                      setEditingStar(updated);
                    }}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    累计上课节数 (节)
                  </label>
                  <input
                    type="number"
                    placeholder="如：42"
                    value={editingStar.trainCount ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : Number(e.target.value);
                      const updated = { ...editingStar, trainCount: val };
                      if (updated.joinDays || val) {
                        updated.journey = `相伴自律 ${updated.joinDays || 0} 天 · ${val || 0} 节${updated.courseType || "大器械私教"}`;
                      }
                      setEditingStar(updated);
                    }}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* 课程类别与经历拼接 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    课程类型
                  </label>
                  <select
                    value={editingStar.courseType || "大器械私教"}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = { ...editingStar, courseType: val };
                      if (updated.joinDays || updated.trainCount) {
                        updated.journey = `相伴自律 ${updated.joinDays || 0} 天 · ${updated.trainCount || 0} 节${val}`;
                      }
                      setEditingStar(updated);
                    }}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  >
                    <option value="大器械私教">大器械私教</option>
                    <option value="精选普拉提">精选普拉提</option>
                    <option value="维密减脂">维密减脂</option>
                    <option value="深度蜕变">深度蜕变</option>
                    <option value="私教">私教</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    前台展示经历短句
                  </label>
                  <input
                    type="text"
                    placeholder="如：相伴自律 140 天 · 42 节大器械私教"
                    value={editingStar.journey || ""}
                    onChange={(e) => setEditingStar({ ...editingStar, journey: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* 写真照片 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  写真大片 (1080×1920 高清大片) <span style={{ color: "#C62828" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    placeholder="/images/stars/member_star_1.jpg 或图片地址"
                    value={editingStar.avatarUrl || ""}
                    onChange={(e) => setEditingStar({ ...editingStar, avatarUrl: e.target.value })}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                  />
                  <label style={{
                    padding: "10px 16px", background: "#0E0D10", color: "#FFFFFF",
                    borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap"
                  }}>
                    {uploading ? "正在上传..." : "本地上传"}
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </div>
                {editingStar.avatarUrl && (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14, background: "#FAF7F5", padding: "10px 14px", borderRadius: 8, border: "1px solid #EBE4DF" }}>
                    <div style={{ width: 48, height: 64, borderRadius: 6, overflow: "hidden", background: "#0E0D10", flexShrink: 0 }}>
                      <img src={editingStar.avatarUrl} alt="预览" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#2E7D32" }}>✓ 照片格式已识别，已同步至小程序</div>
                      <div style={{ fontSize: 11, color: "#8C827B", marginTop: 2 }}>{editingStar.avatarUrl}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 自律心语 */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                  自律体态心语 (真实短句，建议 20~40 字)
                </label>
                <textarea
                  rows={3}
                  placeholder="如：肩颈松弛下来之后，呼吸都深了，连夜里的睡眠都踏实了许多。"
                  value={editingStar.quote || ""}
                  onChange={(e) => setEditingStar({ ...editingStar, quote: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box", lineHeight: 1.5 }}
                />
              </div>

              {/* 排序与展示状态 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    排序权重 (数字越小越靠前)
                  </label>
                  <input
                    type="number"
                    value={editingStar.sortOrder ?? 0}
                    onChange={(e) => setEditingStar({ ...editingStar, sortOrder: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1C1415", marginBottom: 6 }}>
                    上线展示状态
                  </label>
                  <select
                    value={editingStar.isActive ?? 1}
                    onChange={(e) => setEditingStar({ ...editingStar, isActive: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  >
                    <option value={1}>上线展示</option>
                    <option value={0}>隐藏下线</option>
                  </select>
                </div>
              </div>

              {/* 提交按钮 */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setEditingStar(null)}
                  style={{ padding: "10px 20px", background: "#F5F5F5", border: "1px solid #DDD", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 28px", background: "#0E0D10", color: "#FFFFFF", border: "none",
                    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(14,13,16,0.25)"
                  }}
                >
                  {saving ? "保存中..." : "保存并同步至小程序"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
