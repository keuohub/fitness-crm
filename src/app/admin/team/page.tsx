"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import {
  Compass,
  Building,
  Users,
  Layers,
  Plus,
  Upload,
  Edit2,
  Trash2,
  X,
  Award,
  Quote,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

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
  const { showToast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Section 2 Header & Intro settings
  const [sectionHeader, setSectionHeader] = useState({
    secNum: "02",
    secTitle: "同行导师",
    secEn: "MENTORS",
    secIntro: "深耕女子塑形与体态矫正，用细腻口令与精准触觉纠正，守护每次发力安全。",
  });
  const [savingHeader, setSavingHeader] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeam(data);
      }
    } catch (err: any) {
      showToast(err.message || "读取导师阵容失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetch("/api/admin/brand-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setSectionHeader({
            secNum: data.sec2Num || "02",
            secTitle: data.sec2Title || "同行导师",
            secEn: data.sec2En || "MENTORS",
            secIntro: data.sec2Intro || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHeader(true);
    try {
      const getRes = await fetch("/api/admin/brand-settings");
      const current = await getRes.json();
      const payload = {
        ...current,
        sec2Num: sectionHeader.secNum,
        sec2Title: sectionHeader.secTitle,
        sec2En: sectionHeader.secEn,
        sec2Intro: sectionHeader.secIntro,
      };
      const res = await fetch("/api/admin/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("板块二（同行导师）标题与描述已成功更新并同步小程序", "success");
      } else {
        showToast("保存失败，请重试", "error");
      }
    } catch {
      showToast("网络请求异常", "error");
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.name || !editingMember?.roleTitle || !editingMember?.avatarUrl) {
      showToast("请填写导师姓名、专属头衔并上传肖像照", "error");
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
        showToast("导师资料已成功保存并同步小程序", "success");
        await fetchTeam();
      } else {
        const err = await res.json();
        showToast(err.error || "保存失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络请求异常", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/admin/team?id=${deleteConfirmId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        showToast("已删除导师档案", "success");
        await fetchTeam();
      } else {
        showToast("删除失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络异常", "error");
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
        showToast("肖像照上传成功", "success");
        if (data.warning) showToast(data.warning, "error");
      } else {
        showToast(data.error || "上传失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "图片上传异常", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MINIPROGRAM TAB 2 · 同行导师阵容
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">导师团队与专业认证</h1>
          <p className="text-sm text-[#697180] mt-1">
            小程序「了解徕舞」板块二展示的导师档案。展现小桥导师及团队的解剖资质认证、寄语与教学心法。
          </p>
        </div>

        <button
          onClick={() =>
            setEditingMember({
              name: "",
              roleTitle: "资深形体导师",
              avatarUrl: "",
              experience: "8 年执教经验",
              creds: "PMA 认证导师 / 国际康复普拉提认证",
              quote: "以细腻的触觉与口令，唤醒深层核心的支撑力量。",
              bio: "深耕女性体态重塑与骨盆脊柱力学纠正，注重每一次发力的呼吸配合与肌肉本体感觉。",
              sortOrder: team.length + 1,
              isActive: 1,
            })
          }
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 录入新导师档案
        </button>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E1E5EB] shadow-xs overflow-x-auto">
        <Link
          href="/admin/brand"
          className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors"
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
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white flex items-center gap-1.5 shrink-0 shadow-xs"
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

      {/* Section 2 Header & Intro Editor */}
      <form
        onSubmit={handleSaveHeader}
        className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#8B83D7] bg-purple-50 px-2 py-0.5 rounded">
              板块二顶部文案
            </span>
            <span className="text-xs text-[#292D35] font-medium">
              小程序「02 同行导师」标题与指引描述
            </span>
          </div>
          <button
            type="submit"
            disabled={savingHeader}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors"
          >
            {savingHeader ? "保存中..." : "保存板块二文案"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">序号标号 (如 02)</label>
            <input
              type="text"
              value={sectionHeader.secNum}
              onChange={(e) => setSectionHeader({ ...sectionHeader, secNum: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">板块标题 (如 同行导师)</label>
            <input
              type="text"
              value={sectionHeader.secTitle}
              onChange={(e) => setSectionHeader({ ...sectionHeader, secTitle: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">英文小标 (如 MENTORS)</label>
            <input
              type="text"
              value={sectionHeader.secEn}
              onChange={(e) => setSectionHeader({ ...sectionHeader, secEn: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#697180] mb-1">
            板块介绍描述 (展示在标题下方的那句话)
          </label>
          <textarea
            rows={2}
            value={sectionHeader.secIntro}
            onChange={(e) => setSectionHeader({ ...sectionHeader, secIntro: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
          />
        </div>
      </form>

      {/* Team Cards Grid */}
      {loading ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">
          正在读取导师名录...
        </div>
      ) : team.length === 0 ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
          <Users className="w-10 h-10 text-gray-300 mb-2" />
          <span className="font-semibold text-[#292D35]">暂无录入的导师档案</span>
          <span className="text-xs text-[#697180] mt-1">点击右上角按钮添加主理人或导师团队。</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((m) => {
            const isOnline = m.isActive === 1;
            return (
              <div
                key={m.id}
                className="bg-white border border-[#E1E5EB] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Photo Header */}
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs ${
                        isOnline
                          ? "bg-emerald-500/90 text-white backdrop-blur-xs"
                          : "bg-gray-800/80 text-gray-300 backdrop-blur-xs"
                      }`}
                    >
                      {isOnline ? "展示中" : "已隐藏"}
                    </span>
                    <span className="text-[10px] font-mono bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                      排序 {m.sortOrder}
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                    <div className="font-semibold text-lg">{m.name}</div>
                    <div className="text-xs text-white/80 mt-0.5">{m.roleTitle}</div>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {m.creds && (
                      <div className="text-xs text-[#2563EB] font-medium flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.creds}</span>
                      </div>
                    )}
                    {m.quote && (
                      <p className="text-xs text-[#697180] italic leading-relaxed line-clamp-2">
                        “{m.quote}”
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F0F2F6] flex items-center justify-between">
                    <span className="text-[11px] text-[#697180]">{m.experience || "资深导师"}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingMember(m)}
                        className="p-1.5 text-gray-500 hover:text-[#2563EB] rounded hover:bg-gray-100 transition-colors"
                        title="编辑导师"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer: Add / Edit Mentor */}
      {editingMember && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingMember(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">
                    {editingMember.id ? "编辑导师资料" : "录入新导师档案"}
                  </h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    塑造专业、可信赖的导师个人品牌，资料实时同步小程序。
                  </p>
                </div>
                <button
                  onClick={() => setEditingMember(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    导师肖像大片 (推荐 3:4 竖图) *
                  </label>
                  <div className="relative aspect-[3/4] max-h-52 bg-gray-50 border-2 border-dashed border-[#E1E5EB] rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                    {editingMember.avatarUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editingMember.avatarUrl}
                          alt="preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingMember((prev) => ({ ...prev, avatarUrl: "" }))}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs font-medium text-[#292D35]">
                          {uploading ? "正在上传云存储..." : "点击或拖拽上传导师肖像"}
                        </span>
                        <span className="text-[11px] text-[#697180] mt-0.5">JPG / PNG / WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">导师姓名 *</label>
                    <input
                      type="text"
                      placeholder="小桥 / 周教练"
                      value={editingMember.name || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">专属头衔 *</label>
                    <input
                      type="text"
                      placeholder="主理人 / 教学总监"
                      value={editingMember.roleTitle || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, roleTitle: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">资历经验</label>
                    <input
                      type="text"
                      placeholder="8 年教学沉淀"
                      value={editingMember.experience || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, experience: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">权威认证资质</label>
                    <input
                      type="text"
                      placeholder="PMA 国际认证"
                      value={editingMember.creds || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, creds: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">导师教学寄语 Quote</label>
                  <textarea
                    rows={2}
                    placeholder="以克制之道，唤醒身体内在的秩序与平衡。"
                    value={editingMember.quote || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, quote: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">详细介绍 Bio</label>
                  <textarea
                    rows={3}
                    placeholder="专长领域、技术流派与执教风格..."
                    value={editingMember.bio || ""}
                    onChange={(e) => setEditingMember({ ...editingMember, bio: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">显示排序</label>
                    <input
                      type="number"
                      value={editingMember.sortOrder ?? 0}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, sortOrder: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">展示状态</label>
                    <select
                      value={editingMember.isActive ?? 1}
                      onChange={(e) =>
                        setEditingMember({ ...editingMember, isActive: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value={1}>展示中</option>
                      <option value={0}>已隐藏</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-4 py-2 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {saving ? "正在保存..." : "确认保存档案"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">确认移除该导师？</h3>
            <p className="text-xs text-[#697180] mt-1">移除后小程序端将不再呈现该导师名片。</p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
