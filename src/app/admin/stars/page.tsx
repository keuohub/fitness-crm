"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  Sparkles,
  Plus,
  Upload,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  X,
  Image as ImageIcon,
  Quote,
  Award,
  Calendar,
  Layers,
} from "lucide-react";

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
  const { showToast } = useToast();
  const [stars, setStars] = useState<MonthlyStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStar, setEditingStar] = useState<Partial<MonthlyStar> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchStars = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stars");
      const data = await res.json();
      if (Array.isArray(data)) {
        setStars(data);
      }
    } catch (err: any) {
      showToast(err.message || "读取星榜数据失败", "error");
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
      showToast("请填写学员姓名并上传风采写真照片", "error");
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
        showToast("封面星榜资料已保存，小程序端已同步", "success");
        await fetchStars();
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
      const res = await fetch(`/api/admin/stars?id=${deleteConfirmId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        showToast("已成功移除该学员封面", "success");
        await fetchStars();
      } else {
        showToast("删除失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "删除网络异常", "error");
    }
  };

  const handleToggleActive = async (star: MonthlyStar) => {
    const nextActive = star.isActive === 1 ? 0 : 1;
    try {
      const res = await fetch("/api/admin/stars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: star.id, isActive: nextActive }),
      });
      if (res.ok) {
        showToast(`已${nextActive ? "上架展示" : "隐藏"}${star.name}的封面`, "success");
        await fetchStars();
      }
    } catch (err: any) {
      showToast(err.message, "error");
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
        showToast("写真照片已成功上传并压缩", "success");
        if (data.warning) showToast(data.warning, "error");
      } else {
        showToast(data.error || "图片上传失败", "error");
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
            MINIPROGRAM TAB 1 · 徕舞之星
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">学员风采与封面画廊</h1>
          <p className="text-sm text-[#697180] mt-1">
            小程序首屏展示的核心内容。精选坚持训练、收获显著形体改变的学员蜕变故事与视觉大片。
          </p>
        </div>

        <button
          onClick={() =>
            setEditingStar({
              name: "",
              avatarUrl: "",
              joinDays: 90,
              trainCount: 24,
              courseType: "普拉提塑形",
              tag: "优雅形体 · 肩颈舒展",
              quote: "在徕舞的每一次舒展，都让我找回身心的挺拔与从容。",
              sortOrder: 0,
              isActive: 1,
            })
          }
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 录入新学员风采
        </button>
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">
          正在读取封面画廊...
        </div>
      ) : stars.length === 0 ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
          <Sparkles className="w-10 h-10 text-gray-300 mb-2" />
          <span className="font-semibold text-[#292D35]">暂无上架的徕舞之星封面</span>
          <span className="text-xs text-[#697180] mt-1">点击右上角按钮即可上传第一位学员大片。</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stars.map((star) => {
            const isVisible = star.isActive === 1;
            return (
              <div
                key={star.id}
                className="bg-white border border-[#E1E5EB] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Photo Preview Container */}
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden group">
                  {star.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={star.avatarUrl}
                      alt={star.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}

                  {/* Top Overlay Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs ${
                        isVisible
                          ? "bg-emerald-500/90 text-white backdrop-blur-xs"
                          : "bg-gray-800/80 text-gray-300 backdrop-blur-xs"
                      }`}
                    >
                      {isVisible ? "小程序在线" : "已隐藏"}
                    </span>
                    <span className="text-[10px] font-mono bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                      排序 {star.sortOrder}
                    </span>
                  </div>

                  {/* Bottom Gradient with Name & Tag */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                    <div className="font-semibold text-lg">{star.name}</div>
                    <div className="text-xs text-white/80 mt-0.5 flex items-center gap-1.5">
                      <span>{star.courseType || "私教定制"}</span>
                      {star.tag && (
                        <>
                          <span>•</span>
                          <span className="text-[#8B83D7] font-medium">{star.tag}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#697180] tabular-nums">
                      <span>陪伴第 <strong className="text-[#292D35]">{star.joinDays || 0}</strong> 天</span>
                      <span>已习练 <strong className="text-[#292D35]">{star.trainCount || 0}</strong> 节课</span>
                    </div>

                    {star.quote && (
                      <p className="text-xs text-[#697180] italic leading-relaxed line-clamp-2">
                        “{star.quote}”
                      </p>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="pt-2 border-t border-[#F0F2F6] flex items-center justify-between">
                    <button
                      onClick={() => handleToggleActive(star)}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors flex items-center gap-1 ${
                        isVisible
                          ? "text-gray-600 bg-white border-gray-200 hover:bg-gray-50"
                          : "text-[#2563EB] bg-[#E8EEFF] border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {isVisible ? (
                        <>
                          <EyeOff className="w-3 h-3" /> 下架
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> 上架
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingStar(star)}
                        className="p-1.5 text-gray-500 hover:text-[#2563EB] rounded hover:bg-gray-100 transition-colors"
                        title="编辑资料"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(star.id)}
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

      {/* Drawer: Edit / Add Star */}
      {editingStar && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingStar(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">
                    {editingStar.id ? "编辑学员风采" : "录入学员风采"}
                  </h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    照片将呈现在小程序首屏焦点画廊，支持直接拍照或上传高清写真。
                  </p>
                </div>
                <button
                  onClick={() => setEditingStar(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Image Upload Area */}
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    风采封面大片 (推荐 3:4 比例竖图) *
                  </label>
                  <div className="relative aspect-[3/4] max-h-56 bg-gray-50 border-2 border-dashed border-[#E1E5EB] rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                    {editingStar.avatarUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editingStar.avatarUrl}
                          alt="preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingStar((prev) => ({ ...prev, avatarUrl: "" }))}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs font-medium text-[#292D35]">
                          {uploading ? "正在上传云存储并优化..." : "点击或拖拽照片上传"}
                        </span>
                        <span className="text-[11px] text-[#697180] mt-0.5">支持 JPG / PNG / WebP</span>
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

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">学员姓名 *</label>
                  <input
                    type="text"
                    placeholder="例如：林女士 / Grace"
                    value={editingStar.name || ""}
                    onChange={(e) => setEditingStar({ ...editingStar, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">习练天数</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={editingStar.joinDays ?? ""}
                      onChange={(e) =>
                        setEditingStar({
                          ...editingStar,
                          joinDays: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">训练课时数</label>
                    <input
                      type="number"
                      placeholder="36"
                      value={editingStar.trainCount ?? ""}
                      onChange={(e) =>
                        setEditingStar({
                          ...editingStar,
                          trainCount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">训练体系</label>
                    <input
                      type="text"
                      placeholder="普拉提大器械塑形"
                      value={editingStar.courseType || ""}
                      onChange={(e) => setEditingStar({ ...editingStar, courseType: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">主打标签</label>
                    <input
                      type="text"
                      placeholder="体态重塑 · 挺拔肩颈"
                      value={editingStar.tag || ""}
                      onChange={(e) => setEditingStar({ ...editingStar, tag: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">学员蜕变心声 Quote</label>
                  <textarea
                    rows={3}
                    placeholder="在徕舞的每一次舒展，都让我找回身体的轻盈与自信。"
                    value={editingStar.quote || ""}
                    onChange={(e) => setEditingStar({ ...editingStar, quote: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">显示排序 (数字越小越前)</label>
                    <input
                      type="number"
                      value={editingStar.sortOrder ?? 0}
                      onChange={(e) =>
                        setEditingStar({ ...editingStar, sortOrder: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">展示状态</label>
                    <select
                      value={editingStar.isActive ?? 1}
                      onChange={(e) =>
                        setEditingStar({ ...editingStar, isActive: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value={1}>在线展示</option>
                      <option value={0}>暂隐藏</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingStar(null)}
                    className="px-4 py-2 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {saving ? "正在发布..." : "确认发布封面"}
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
            <h3 className="text-base font-semibold text-[#292D35]">确认移除该封面？</h3>
            <p className="text-xs text-[#697180] mt-1">
              移除后，该封面将不再出现在小程序端首屏。
            </p>
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
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
