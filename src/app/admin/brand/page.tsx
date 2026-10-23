"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import {
  Compass,
  Building,
  Users,
  Layers,
  Sparkles,
  Save,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

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
  const { showToast } = useToast();
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

  useEffect(() => {
    fetch("/api/admin/brand-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast("品牌主视觉文案已成功保存并同步小程序", "success");
      } else {
        showToast("保存失败，请检查网络", "error");
      }
    } catch {
      showToast("网络请求异常", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MINIPROGRAM TAB 2 · 了解徕舞
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">品牌理念与全局设定</h1>
          <p className="text-sm text-[#697180] mt-1">
            统筹管理小程序「了解徕舞」的主屏标题、三大板块引导文案及对应的空间、导师和课程库。
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E1E5EB] shadow-xs overflow-x-auto">
        <Link
          href="/admin/brand"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Compass className="w-3.5 h-3.5" /> 品牌理念主视觉
        </Link>
        <Link
          href="/admin/venue"
          className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <Building className="w-3.5 h-3.5" /> 场馆空间实景
        </Link>
        <Link
          href="/admin/team"
          className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <Users className="w-3.5 h-3.5" /> 同行导师团队
        </Link>
        <Link
          href="/admin/offerings"
          className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <Layers className="w-3.5 h-3.5" /> 课程体系与底图
        </Link>
      </div>

      {/* 3 Quick Jump Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#2563EB] bg-[#E8EEFF] px-2 py-0.5 rounded">
                板块一 · SPACES
              </span>
              <Building className="w-4 h-4 text-[#697180]" />
            </div>
            <h3 className="text-base font-semibold text-[#292D35] mt-3">场馆空间管理</h3>
            <p className="text-xs text-[#697180] mt-1 leading-relaxed">
              核心床大器械静修区、沉浸采光与私密更衣室实拍大片管理。
            </p>
          </div>
          <Link
            href="/admin/venue"
            className="mt-4 pt-3 border-t border-[#F0F2F6] text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-1"
          >
            维护空间相册与排序 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#8B83D7] bg-purple-50 px-2 py-0.5 rounded">
                板块二 · MENTORS
              </span>
              <Users className="w-4 h-4 text-[#697180]" />
            </div>
            <h3 className="text-base font-semibold text-[#292D35] mt-3">同行导师团队</h3>
            <p className="text-xs text-[#697180] mt-1 leading-relaxed">
              小桥主理人及资深形体导师团队、解剖资质认证与肖像画廊。
            </p>
          </div>
          <Link
            href="/admin/team"
            className="mt-4 pt-3 border-t border-[#F0F2F6] text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-1"
          >
            维护导师名册与介绍 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-[#E1E5EB] rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-[#2563EB]/40 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#292D35] bg-[#F0F2F6] px-2 py-0.5 rounded">
                板块三 · OFFERINGS
              </span>
              <Layers className="w-4 h-4 text-[#697180]" />
            </div>
            <h3 className="text-base font-semibold text-[#292D35] mt-3">课程体系与底图</h3>
            <p className="text-xs text-[#697180] mt-1 leading-relaxed">
              普拉提核心塑形、高定大器械等课程板块介绍与实拍全景海报。
            </p>
          </div>
          <Link
            href="/admin/offerings"
            className="mt-4 pt-3 border-t border-[#F0F2F6] text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-1"
          >
            配置课程大类与背景海报 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-[#292D35]">页面全局 Hero 主标题与副标题</h2>
          <p className="text-xs text-[#697180] mt-0.5">学员进入「了解徕舞」页面顶端时呈现的第一视觉文案。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1">主标题</label>
            <input
              type="text"
              value={settings.heroTitle}
              onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292D35] mb-1">副标题</label>
            <input
              type="text"
              value={settings.heroSubtitle}
              onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white text-[#292D35]"
            />
          </div>
        </div>

        {/* Section 1 */}
        <div className="pt-4 border-t border-[#E1E5EB] space-y-3">
          <div className="text-xs font-semibold text-[#2563EB] uppercase tracking-wider">
            板块一配置 · 空间模块标题与引导语
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">序号标号</label>
              <input
                type="text"
                value={settings.sec1Num}
                onChange={(e) => setSettings({ ...settings, sec1Num: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">中文标题</label>
              <input
                type="text"
                value={settings.sec1Title}
                onChange={(e) => setSettings({ ...settings, sec1Title: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">英文小标</label>
              <input
                type="text"
                value={settings.sec1En}
                onChange={(e) => setSettings({ ...settings, sec1En: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#697180] mb-1">板块指引描述</label>
            <textarea
              rows={2}
              value={settings.sec1Intro}
              onChange={(e) => setSettings({ ...settings, sec1Intro: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
            />
          </div>
        </div>

        {/* Section 2 */}
        <div className="pt-4 border-t border-[#E1E5EB] space-y-3">
          <div className="text-xs font-semibold text-[#8B83D7] uppercase tracking-wider">
            板块二配置 · 导师模块标题与引导语
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">序号标号</label>
              <input
                type="text"
                value={settings.sec2Num}
                onChange={(e) => setSettings({ ...settings, sec2Num: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">中文标题</label>
              <input
                type="text"
                value={settings.sec2Title}
                onChange={(e) => setSettings({ ...settings, sec2Title: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">英文小标</label>
              <input
                type="text"
                value={settings.sec2En}
                onChange={(e) => setSettings({ ...settings, sec2En: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#697180] mb-1">板块指引描述</label>
            <textarea
              rows={2}
              value={settings.sec2Intro}
              onChange={(e) => setSettings({ ...settings, sec2Intro: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
            />
          </div>
        </div>

        {/* Section 3 */}
        <div className="pt-4 border-t border-[#E1E5EB] space-y-3">
          <div className="text-xs font-semibold text-[#292D35] uppercase tracking-wider">
            板块三配置 · 项目模块标题与引导语
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">序号标号</label>
              <input
                type="text"
                value={settings.sec3Num}
                onChange={(e) => setSettings({ ...settings, sec3Num: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">中文标题</label>
              <input
                type="text"
                value={settings.sec3Title}
                onChange={(e) => setSettings({ ...settings, sec3Title: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#697180] mb-1">英文小标</label>
              <input
                type="text"
                value={settings.sec3En}
                onChange={(e) => setSettings({ ...settings, sec3En: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#697180] mb-1">板块指引描述</label>
            <textarea
              rows={2}
              value={settings.sec3Intro}
              onChange={(e) => setSettings({ ...settings, sec3Intro: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "正在保存..." : "保存品牌文案设定"}
          </button>
        </div>
      </form>
    </div>
  );
}
