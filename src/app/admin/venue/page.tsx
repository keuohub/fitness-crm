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
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";

interface VenueItem {
  id: number;
  title: string;
  name?: string;
  tag?: string;
  desc?: string;
  imageUrl: string;
  sortOrder: number;
  isActive: number;
  createdAt: string;
}

export default function AdminVenuePage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<VenueItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Section 1 Header & Intro settings
  const [sectionHeader, setSectionHeader] = useState({
    secNum: "01",
    secTitle: "场馆空间",
    secEn: "SPACES",
    secIntro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
  });
  const [savingHeader, setSavingHeader] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/venue");
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err: any) {
      showToast(err.message || "读取场馆数据失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetch("/api/admin/brand-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setSectionHeader({
            secNum: data.sec1Num || "01",
            secTitle: data.sec1Title || "场馆空间",
            secEn: data.sec1En || "SPACES",
            secIntro: data.sec1Intro || "",
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
        sec1Num: sectionHeader.secNum,
        sec1Title: sectionHeader.secTitle,
        sec1En: sectionHeader.secEn,
        sec1Intro: sectionHeader.secIntro,
      };
      const res = await fetch("/api/admin/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("板块一（场馆空间）标题与描述已成功更新并同步小程序", "success");
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
    if (!editingItem?.title || !editingItem?.imageUrl) {
      showToast("请填写空间名称并上传实拍大片", "error");
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
        showToast("空间实景已成功更新", "success");
        await fetchItems();
      } else {
        const err = await res.json();
        showToast(err.error || "保存失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络请求失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/admin/venue?id=${deleteConfirmId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirmId(null);
        showToast("空间记录已成功删除", "success");
        await fetchItems();
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
        setEditingItem((prev) => ({ ...prev, imageUrl: data.url }));
        showToast("照片已成功上传", "success");
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
            MINIPROGRAM TAB 2 · 场馆空间实景
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">场馆空间与器械大片</h1>
          <p className="text-sm text-[#697180] mt-1">
            小程序「了解徕舞」板块一展示的实景大片，支持自由调整标题、简介、大图与呈现顺序。
          </p>
        </div>

        <button
          onClick={() => {
            const nextOrder = items.length + 1;
            const nextTag = `${String(nextOrder).padStart(2, "0")} / 空间实景`;
            setEditingItem({
              title: "",
              name: "",
              tag: nextTag,
              desc: "",
              imageUrl: "",
              sortOrder: nextOrder,
              isActive: 1,
            });
          }}
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 上传新空间照片
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
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white flex items-center gap-1.5 shrink-0 shadow-xs"
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

      {/* Section 1 Header & Intro Editor */}
      <form
        onSubmit={handleSaveHeader}
        className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2563EB] bg-[#E8EEFF] px-2 py-0.5 rounded">
              板块一顶部文案
            </span>
            <span className="text-xs text-[#292D35] font-medium">
              小程序「01 场馆空间」标题与指引描述
            </span>
          </div>
          <button
            type="submit"
            disabled={savingHeader}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors"
          >
            {savingHeader ? "保存中..." : "保存板块一文案"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">序号标号 (如 01)</label>
            <input
              type="text"
              value={sectionHeader.secNum}
              onChange={(e) => setSectionHeader({ ...sectionHeader, secNum: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">板块标题 (如 场馆空间)</label>
            <input
              type="text"
              value={sectionHeader.secTitle}
              onChange={(e) => setSectionHeader({ ...sectionHeader, secTitle: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">英文小标 (如 SPACES)</label>
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

      {/* Grid of venue cards */}
      {loading ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">
          正在读取空间相册...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
          <Building className="w-10 h-10 text-gray-300 mb-2" />
          <span className="font-semibold text-[#292D35]">暂无场馆空间大片</span>
          <span className="text-xs text-[#697180] mt-1">点击右上角按钮上传第一张场馆实拍。</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const isOnline = item.isActive === 1;
            return (
              <div
                key={item.id}
                className="bg-white border border-[#E1E5EB] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
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
                      排序 {item.sortOrder}
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="text-[11px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                      {item.tag || "01 / 空间实景"}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-[#292D35]">{item.title}</h3>
                      <span className="text-[10px] text-[#2563EB] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">
                        角标: {item.tag || "未设"}
                      </span>
                    </div>
                    {item.desc && (
                      <p className="text-xs text-[#697180] mt-1.5 leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F0F2F6] flex items-center justify-between">
                    <span className="text-[11px] text-[#697180]">
                      创建: {String(item.createdAt || "").slice(0, 10)}
                    </span>
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

      {/* Drawer: Add / Edit Item */}
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
                    {editingItem.id ? "编辑空间相册" : "上传新空间相片"}
                  </h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    高清实拍展示场馆采光、进口木质大器械与私密更衣室。
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
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1.5">
                    实景照片大片 (推荐 16:10 横图) *
                  </label>
                  <div className="relative aspect-[16/10] bg-gray-50 border-2 border-dashed border-[#E1E5EB] rounded-xl overflow-hidden flex flex-col items-center justify-center p-3 text-center">
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
                          onClick={() => setEditingItem((prev) => ({ ...prev, imageUrl: "" }))}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs font-medium text-[#292D35]">
                          {uploading ? "正在上传云存储..." : "点击或拖拽空间大片"}
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

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">
                    空间名称 * <span className="text-[#697180] font-normal">(小程序卡片标题，如：高定美学大器械)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：高定美学大器械 / 精品普拉提"
                    value={editingItem.title || ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        title: e.target.value,
                        name: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">
                    左上角角标标签 * <span className="text-[#697180] font-normal">(小程序图片左上角胶囊文字)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：01 / 大器械实景 或 02 / 核心床静修区"
                    value={editingItem.tag || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, tag: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                  <p className="text-[11px] text-[#697180] mt-1">
                    显示在手机端照片左上角，可任意自定义序号与区域名（如 01 / 空间实景、02 / 私享测评室）。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">空间描述 (可选)</label>
                  <textarea
                    rows={3}
                    placeholder="例如：通透柔和自然采光，进口实木大器械，营造沉静专注的私密身心练习氛围。"
                    value={editingItem.desc || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, desc: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
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
                      <option value={1}>展示中</option>
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
                    {saving ? "正在保存..." : "确认保存空间"}
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
            <h3 className="text-base font-semibold text-[#292D35]">确认移除该空间照片？</h3>
            <p className="text-xs text-[#697180] mt-1">移除后小程序端将不再呈现此空间。</p>
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
