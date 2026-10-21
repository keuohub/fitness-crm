"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TeamMember {
  id: number;
  name: string;
  roleTitle: string;
  avatarUrl: string;
  experience?: string | null;
  creds?: string | null;
  quote?: string | null;
  bio?: string | null;
  sortOrder: number;
  isActive: number;
  createdAt: string;
}

export default function AdminTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeam(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember?.roleTitle || !editingMember?.avatarUrl) {
      alert("请填写姓名、称谓并上传或填入肖像照！");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingMember.id;
      const res = await fetch("/api/admin/team", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMember),
      });
      if (res.ok) {
        setEditingMember(null);
        fetchTeam();
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
    if (!confirm("确定要删除该团队成员吗？")) return;
    try {
      const res = await fetch(`/api/admin/team?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTeam();
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
        setEditingMember((prev) => ({ ...prev, avatarUrl: data.url }));
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
            🧘 第 2 板块：了解徕舞 · 导师阵容管理
          </h1>
          <p style={{ fontSize: 13, color: "#7A6B69", marginTop: 6, margin: 0 }}>
            呈现真实、温润、可信的导师团队形象，不搞花哨证书认证与推销式按钮
          </p>
        </div>
        <button
          onClick={() => setEditingMember({ name: "", roleTitle: "普拉提导师", avatarUrl: "", bio: "", sortOrder: team.length + 1, isActive: 1 })}
          style={{
            background: "#5E1914", color: "#FFFFFF", border: "none", padding: "12px 24px",
            borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 8px rgba(94,25,20,0.25)"
          }}
        >
          ＋ 添加团队成员
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9E9E9E" }}>加载中...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {team.map((m) => (
            <div
              key={m.id}
              style={{
                background: "#FFFFFF", borderRadius: 12, border: "1px solid #EBE4DF", overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)", display: "flex", flexDirection: "column"
              }}
            >
              <div style={{ position: "relative", width: "100%", height: 260, background: "#2C1B1D" }}>
                <img
                  src={m.avatarUrl}
                  alt={m.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: m.isActive === 1 ? "rgba(46, 125, 50, 0.9)" : "rgba(100, 100, 100, 0.9)",
                  color: "#FFFFFF", fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500
                }}>
                  {m.isActive === 1 ? "展示中" : "已隐藏"}
                </div>
              </div>

              <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 600, color: "#1C1415" }}>{m.name}</h3>
                    <span style={{ fontSize: 12, color: "#8B5E3C" }}>排序: {m.sortOrder}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#8B5E3C", fontWeight: 500, marginBottom: 4 }}>{m.roleTitle}</div>
                  {m.experience && (
                    <div style={{ fontSize: 11, color: "#5E1914", fontWeight: 600, marginBottom: 4 }}>
                      {m.experience}
                    </div>
                  )}
                  {m.creds && (
                    <div style={{ fontSize: 11, color: "#8C827B", marginBottom: 6, lineHeight: 1.4 }}>
                      {m.creds}
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: "#665E5C", lineHeight: 1.5, fontStyle: "italic" }}>
                    {m.quote || m.bio ? `“${m.quote || m.bio}”` : "（暂无心语）"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 18, borderTop: "1px solid #F0EAE6", paddingTop: 12 }}>
                  <button
                    onClick={() => setEditingMember(m)}
                    style={{
                      flex: 1, padding: "8px 0", background: "#FAF7F5", border: "1px solid #E2D9D2",
                      borderRadius: 6, fontSize: 12, cursor: "pointer", color: "#5E1914", fontWeight: 500
                    }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
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
      {editingMember && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: 480, maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#1C1415" }}>
              {editingMember.id ? "编辑导师信息" : "添加团队导师"}
            </h2>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  导师姓名 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：小桥"
                  value={editingMember.name || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  导师角色 / 称谓 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：创始人 / 教学主理人"
                  value={editingMember.roleTitle || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, roleTitle: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  研习资历 (展示在小程序导师卡中)
                </label>
                <input
                  type="text"
                  placeholder="如：12 年普拉提与运动解剖研习"
                  value={editingMember.experience || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, experience: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  认证资质与特长
                </label>
                <input
                  type="text"
                  placeholder="如：PMA 国际认证普拉提导师 · 脊柱侧弯与体态力学康复认证"
                  value={editingMember.creds || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, creds: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  导师心语 / 亲笔手札 (让会员产生情感共鸣与信任)
                </label>
                <textarea
                  rows={3}
                  placeholder="如：“不追求花哨夸张的高难动作，而是在每一次深长呼吸里找准深层核心，让紧绷的脊柱自然舒展。”"
                  value={editingMember.quote || editingMember.bio || ""}
                  onChange={(e) => setEditingMember({ ...editingMember, quote: e.target.value, bio: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                  肖像照片 <span style={{ color: "#C62828" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    type="text"
                    required
                    placeholder="/images/team/team-1.jpg 或图片地址"
                    value={editingMember.avatarUrl || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, avatarUrl: e.target.value })}
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
                    value={editingMember.sortOrder ?? 0}
                    onChange={(e) => setEditingMember({ ...editingMember, sortOrder: Number(e.target.value) })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#4A403E", marginBottom: 6 }}>
                    展示状态
                  </label>
                  <select
                    value={editingMember.isActive ?? 1}
                    onChange={(e) => setEditingMember({ ...editingMember, isActive: Number(e.target.value) })}
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
                  onClick={() => setEditingMember(null)}
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
