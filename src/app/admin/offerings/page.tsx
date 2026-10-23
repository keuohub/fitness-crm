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
  Target,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

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
  const { showToast } = useToast();
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<CourseOffering> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchOfferings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offerings");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOfferings(data);
      }
    } catch (err: any) {
      showToast(err.message || "读取课程体系失败", "error");
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
        setEditingItem((prev) => (prev ? { ...prev, imageUrl: data.url } : null));
        showToast("课程专属底图已成功上传", "success");
        if (data.warning) showToast(data.warning, "error");
      } else {
        showToast("底图上传失败", "error");
      }
    } catch {
      showToast("图片上传网络异常", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.num) {
      showToast("请填写课程编号和课程大类名称", "error");
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
        showToast("课程体系已成功保存并同步小程序", "success");
        await fetchOfferings();
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
      const res = await fetch(`/api/admin/offerings?id=${deleteConfirmId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        showToast("课程体系板块已成功删除", "success");
        await fetchOfferings();
      } else {
        showToast("删除失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "删除网络异常", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MINIPROGRAM TAB 2 · 课程体系与底图
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">项目体系与专属实拍底图</h1>
          <p className="text-sm text-[#697180] mt-1">
            小程序「了解徕舞」板块三展示的训练体系。支持绑定沉浸式实拍大底图、训练目标与技术核心。
          </p>
        </div>

        <button
          onClick={() =>
            setEditingItem({
              num: String(offerings.length + 1).padStart(2, "0"),
              name: "",
              enName: "PILATES SYSTEM",
              summary: "针对核心肌群深度觉知与形体线条重塑的专项训练体系。",
              target: "圆肩驼背 / 骨盆前倾 / 假胯宽及核心力量薄弱者",
              highlight: "大器械阻力抗阻 · 3D解剖对位 · 脊柱深层节律延伸",
              sortOrder: offerings.length + 1,
              isActive: 1,
            })
          }
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 录入新课程板块
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
          className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <Users className="w-3.5 h-3.5" /> 同行导师团队
        </Link>
        <Link
          href="/admin/offerings"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Layers className="w-3.5 h-3.5" /> 课程体系与底图
        </Link>
      </div>

      {/* Grid of Course Offerings */}
      {loading ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">
          正在读取课程体系...
        </div>
      ) : offerings.length === 0 ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
          <Layers className="w-10 h-10 text-gray-300 mb-2" />
          <span className="font-semibold text-[#292D35]">暂无录入的课程板块</span>
          <span className="text-xs text-[#697180] mt-1">点击右上角按钮添加普拉提或私教定制体系。</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offerings.map((item) => {
            const isOnline = item.isActive === 1;
            return (
              <div
                key={item.id}
                className="bg-white border border-[#E1E5EB] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Visual Banner */}
                <div className="relative h-44 bg-slate-900 overflow-hidden group">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-slate-800">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Header badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="font-mono text-xs font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded">
                      {item.num}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs ${
                        isOnline ? "bg-emerald-500/90" : "bg-gray-800/80 text-gray-300"
                      }`}
                    >
                      {isOnline ? "已上线" : "已隐藏"}
                    </span>
                  </div>

                  {/* Bottom title on banner */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <div className="text-[11px] font-mono tracking-wider text-white/70 mt-0.5">
                      {item.enName}
                    </div>
                  </div>
                </div>

                {/* Details body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <p className="text-xs text-[#292D35] leading-relaxed">
                      {item.summary}
                    </p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-1.5 text-[#697180]">
                        <Target className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                        <span><strong className="text-[#292D35]">适宜人群：</strong>{item.target}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-[#697180]">
                        <Sparkles className="w-3.5 h-3.5 text-[#8B83D7] shrink-0 mt-0.5" />
                        <span><strong className="text-[#292D35]">体系亮点：</strong>{item.highlight}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F0F2F6] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#697180]">排序权重: {item.sortOrder}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-gray-500 hover:text-[#2563EB] rounded hover:bg-gray-100 transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
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

      {/* Drawer: Add / Edit Offering */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingItem(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">
                    {editingItem.id ? "编辑课程板块" : "录入新课程板块"}
                  </h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    展示在小程序「了解徕舞」课程板块中，配以专属实拍底图。
                  </p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Background Image Upload */}
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    专属实拍背景海报 (推荐 16:9 质感实拍)
                  </label>
                  <div className="relative aspect-[16/9] bg-gray-50 border-2 border-dashed border-[#E1E5EB] rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                    {editingItem.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editingItem.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingItem((prev) => (prev ? { ...prev, imageUrl: "" } : null))}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs font-medium text-[#292D35]">
                          {uploading ? "正在上传云存储..." : "点击或拖拽上传背景大图"}
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

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">序号 (如 01) *</label>
                    <input
                      type="text"
                      placeholder="01"
                      value={editingItem.num || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, num: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[#292D35] mb-1">板块中文名称 *</label>
                    <input
                      type="text"
                      placeholder="普拉提核心塑形"
                      value={editingItem.name || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">英文小标</label>
                  <input
                    type="text"
                    placeholder="CORE PILATES SYSTEM"
                    value={editingItem.enName || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, enName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">板块概述 Summary</label>
                  <textarea
                    rows={2}
                    placeholder="针对深层核心与形体线条的定制训练..."
                    value={editingItem.summary || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">适宜人群 Target</label>
                  <input
                    type="text"
                    placeholder="体态不适 / 核心无力 / 产后形体修复"
                    value={editingItem.target || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, target: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">核心亮点 Highlight</label>
                  <input
                    type="text"
                    placeholder="大器械抗阻 · 呼吸节律 · 骨盆脊柱对位"
                    value={editingItem.highlight || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, highlight: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">显示排序</label>
                    <input
                      type="number"
                      value={editingItem.sortOrder ?? 0}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, sortOrder: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">展示状态</label>
                    <select
                      value={editingItem.isActive ?? 1}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, isActive: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value={1}>已上线</option>
                      <option value={0}>已隐藏</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {saving ? "正在保存..." : "确认保存板块"}
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
            <h3 className="text-base font-semibold text-[#292D35]">确认移除该课程体系？</h3>
            <p className="text-xs text-[#697180] mt-1">移除后小程序端将不再呈现该课程板块介绍。</p>
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
