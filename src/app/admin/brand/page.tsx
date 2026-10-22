"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BrandSettings {
  heroTitle: string;
  heroSubtitle: string;
  sec1Num: string;
  sec1Title: string;
  sec1En: string;
  sec1Intro: string;
  sec2Num: string;
  sec2Title: string;
  sec2En: string;
  sec2Intro: string;
  sec3Num: string;
  sec3Title: string;
  sec3En: string;
  sec3Intro: string;
}

export default function AdminBrandUnifiedPage() {
  const [settings, setSettings] = useState<BrandSettings>({
    heroTitle: "了解徕舞",
    heroSubtitle: "以克制之道，唤醒身体内在的秩序与平衡",
    sec1Num: "01",
    sec1Title: "场馆空间",
    sec1En: "SPACES",
    sec1Intro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
    sec2Num: "02",
    sec2Title: "同行导师",
    sec2En: "MENTORS",
    sec2Intro: "深耕人体解剖与体态矫正，用细腻口令与精准触觉纠正，守护每次发力安全。",
    sec3Num: "03",
    sec3Title: "项目介绍",
    sec3En: "OFFERINGS",
    sec3Intro: "针对不同阶段与体态目标，由主理团队精心研发的核心训练体系。",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/brand-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("保存失败");
      }
    } catch {
      alert("网络请求失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* 顶部面包屑与标题 */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin" style={{ fontSize: 13, color: "#8B5E3C", textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
          ← 返回管理总览
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C1415", margin: "0 0 8px 0" }}>
              🏛️ 「了解徕舞」全能控制中心
            </h1>
            <p style={{ fontSize: 14, color: "#7A6B69", margin: 0 }}>
              集中掌控小程序「了解徕舞」页面主标题、三大板块标题/简介，以及对应的空间实景、导师阵容、课程体系与实拍底图。
            </p>
          </div>
          {saveSuccess && (
            <div style={{ background: "#E8F5E9", color: "#2E7D32", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              ✓ 文案已成功保存并同步前台
            </div>
          )}
        </div>
      </div>

      {/* 三大板块快捷直达卡片 (列表增删改、实拍图/底图管理、排序) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 36 }}>
        {/* 板块 1: 场馆空间 */}
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #EBE4DF", padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8B5E3C", background: "#F5ECE5", padding: "3px 8px", borderRadius: 4 }}>
              板块一
            </span>
            <span style={{ fontSize: 12, color: "#9E948E" }}>无限新增 · 自由排序</span>
          </div>
          <h3 style={{ margin: "0 0 6px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
            🏛️ 场馆空间管理
          </h3>
          <p style={{ fontSize: 13, color: "#6D645D", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            管理核心床静修区、私密更衣室等空间实景卡片、描述与横滑大片。
          </p>
          <Link
            href="/admin/venue"
            style={{
              display: "inline-block",
              width: "100%",
              textAlign: "center",
              background: "#FAF7F5",
              color: "#5E1914",
              border: "1px solid #D8CFC8",
              padding: "10px 0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxSizing: "border-box"
            }}
          >
            进入场馆空间管理 (传实拍/排序) →
          </Link>
        </div>

        {/* 板块 2: 同行导师 */}
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #EBE4DF", padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8B5E3C", background: "#F5ECE5", padding: "3px 8px", borderRadius: 4 }}>
              板块二
            </span>
            <span style={{ fontSize: 12, color: "#9E948E" }}>无限新增 · 自由排序</span>
          </div>
          <h3 style={{ margin: "0 0 6px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
            🧘 同行导师管理
          </h3>
          <p style={{ fontSize: 13, color: "#6D645D", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            管理小桥及各位资深塑形教练姓名、头衔、寄语、肖像照与上下线。
          </p>
          <Link
            href="/admin/team"
            style={{
              display: "inline-block",
              width: "100%",
              textAlign: "center",
              background: "#FAF7F5",
              color: "#5E1914",
              border: "1px solid #D8CFC8",
              padding: "10px 0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxSizing: "border-box"
            }}
          >
            进入同行导师管理 (换头像/排序) →
          </Link>
        </div>

        {/* 板块 3: 项目介绍 */}
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #EBE4DF", padding: 22, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8B5E3C", background: "#F5ECE5", padding: "3px 8px", borderRadius: 4 }}>
              板块三
            </span>
            <span style={{ fontSize: 12, color: "#9E948E" }}>无限新增 · 自由排序</span>
          </div>
          <h3 style={{ margin: "0 0 6px 0", fontSize: 18, color: "#1C1415", fontWeight: 700 }}>
            ✨ 项目介绍与底图
          </h3>
          <p style={{ fontSize: 13, color: "#6D645D", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            管理普拉提、高定大器械等课程板块、训练重点与<strong>专属实拍底图</strong>。
          </p>
          <Link
            href="/admin/offerings"
            style={{
              display: "inline-block",
              width: "100%",
              textAlign: "center",
              background: "#5E1914",
              color: "#FFFFFF",
              border: "none",
              padding: "10px 0",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              boxSizing: "border-box",
              boxShadow: "0 2px 8px rgba(94,25,20,0.25)"
            }}
          >
            进入项目介绍与底图管理 →
          </Link>
        </div>
      </div>

      {/* 页面主标题与三大板块标题/简介表单 */}
      <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #EBE4DF", padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1C1415", margin: "0 0 8px 0" }}>
          ✏️ 编辑「了解徕舞」页面主标题与板块介绍
        </h2>
        <p style={{ fontSize: 13, color: "#7A6B69", margin: "0 0 24px 0" }}>
          在此处修改前台显示的标题与指引文案，点击保存即可实时更新到手机端。
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8C827B" }}>加载中...</div>
        ) : (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* 顶部主标题与副标题 */}
            <div style={{ background: "#FAF7F5", padding: 18, borderRadius: 10, border: "1px solid #EDE4DE" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#5E1914", marginBottom: 12 }}>
                一、顶部页面标头
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                    页面大标题
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.heroTitle}
                    onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>
                    页面副标题 / 品牌宣言
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.heroSubtitle}
                    onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </div>

            {/* 板块一：场馆空间 */}
            <div style={{ background: "#FAF7F5", padding: 18, borderRadius: 10, border: "1px solid #EDE4DE" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#5E1914", marginBottom: 12 }}>
                二、板块一（场馆空间）标题与文案
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>编号</label>
                  <input
                    type="text"
                    value={settings.sec1Num}
                    onChange={(e) => setSettings({ ...settings, sec1Num: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>中文板块标题</label>
                  <input
                    type="text"
                    value={settings.sec1Title}
                    onChange={(e) => setSettings({ ...settings, sec1Title: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>英文标示</label>
                  <input
                    type="text"
                    value={settings.sec1En}
                    onChange={(e) => setSettings({ ...settings, sec1En: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>板块引导介绍文案</label>
                <textarea
                  rows={2}
                  value={settings.sec1Intro}
                  onChange={(e) => setSettings({ ...settings, sec1Intro: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* 板块二：同行导师 */}
            <div style={{ background: "#FAF7F5", padding: 18, borderRadius: 10, border: "1px solid #EDE4DE" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#5E1914", marginBottom: 12 }}>
                三、板块二（同行导师）标题与文案
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>编号</label>
                  <input
                    type="text"
                    value={settings.sec2Num}
                    onChange={(e) => setSettings({ ...settings, sec2Num: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>中文板块标题</label>
                  <input
                    type="text"
                    value={settings.sec2Title}
                    onChange={(e) => setSettings({ ...settings, sec2Title: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>英文标示</label>
                  <input
                    type="text"
                    value={settings.sec2En}
                    onChange={(e) => setSettings({ ...settings, sec2En: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>板块引导介绍文案</label>
                <textarea
                  rows={2}
                  value={settings.sec2Intro}
                  onChange={(e) => setSettings({ ...settings, sec2Intro: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* 板块三：项目介绍 */}
            <div style={{ background: "#FAF7F5", padding: 18, borderRadius: 10, border: "1px solid #EDE4DE" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#5E1914", marginBottom: 12 }}>
                四、板块三（项目介绍）标题与文案
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 140px", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>编号</label>
                  <input
                    type="text"
                    value={settings.sec3Num}
                    onChange={(e) => setSettings({ ...settings, sec3Num: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>中文板块标题</label>
                  <input
                    type="text"
                    value={settings.sec3Title}
                    onChange={(e) => setSettings({ ...settings, sec3Title: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>英文标示</label>
                  <input
                    type="text"
                    value={settings.sec3En}
                    onChange={(e) => setSettings({ ...settings, sec3En: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4A403E", marginBottom: 6 }}>板块引导介绍文案</label>
                <textarea
                  rows={2}
                  value={settings.sec3Intro}
                  onChange={(e) => setSettings({ ...settings, sec3Intro: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #D1C7C1", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* 提交按钮 */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 32px",
                  background: "#5E1914",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(94,25,20,0.3)",
                }}
              >
                {saving ? "正在保存..." : "💾 保存全部标题与介绍"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
