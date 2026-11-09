"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/admin/Toast";
import {
  CalendarCheck,
  Plus,
  Upload,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone,
  Check,
  Loader2,
  Palette,
  Layers,
  Type,
  X,
  RefreshCw,
  Sliders,
} from "lucide-react";

interface CategoryItem {
  id: number;
  key: string;
  name: string;
  short_name: string;
  tagline: string;
  button_text: string;
  image_url: string;
  sort_order: number;
  is_active: number;
}

interface LandingSettings {
  font_family: string;
  capsule_style: string;
  show_tagline: number;
}

export default function AdminBookingLandingPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [settings, setSettings] = useState<LandingSettings>({
    font_family: "song",
    capsule_style: "glass",
    show_tagline: 1,
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // 编辑 / 新增抽屉
  const [editingItem, setEditingItem] = useState<Partial<CategoryItem> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/booking-landing");
      const data = await res.json();
      if (res.ok) {
        setCategories(data.categories || []);
        if (data.settings) {
          setSettings(data.settings);
        }
      } else {
        showToast(data.error || "读取数据失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络异常", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 快捷上传单张图片
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "上传失败");
      }
      if (data.warning) showToast(data.warning, "error");
      setEditingItem((prev) => (prev ? { ...prev, image_url: data.url } : null));
      showToast("实拍背景图上传成功", "success");
    } catch (err: any) {
      showToast(err.message || "上传图片异常", "error");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 保存单个分类
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.name || !editingItem.short_name || !editingItem.image_url) {
      showToast("请填写课程全称、胶囊简称并上传背景图片", "error");
      return;
    }

    setSavingItem(true);
    try {
      const res = await fetch("/api/admin/booking-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "保存成功", "success");
        setEditingItem(null);
        await fetchData();
      } else {
        showToast(data.error || "保存失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络异常", "error");
    } finally {
      setSavingItem(false);
    }
  };

  // 删除分类
  const handleDeleteItem = async (id: number) => {
    if (!window.confirm("确定要删除该课程分类吗？")) return;
    try {
      const res = await fetch(`/api/admin/booking-landing?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("已删除分类", "success");
        await fetchData();
      } else {
        showToast(data.error || "删除失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "删除网络异常", "error");
    }
  };

  // 上移/下移排序
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const orders = list.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    setCategories(list.map((item, idx) => ({ ...item, sort_order: idx + 1 })));

    try {
      const res = await fetch("/api/admin/booking-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reorder", orders }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || "保存排序失败", "error");
        await fetchData();
      } else {
        showToast("排序已更新", "success");
      }
    } catch (err: any) {
      showToast(err.message || "网络异常", "error");
      await fetchData();
    }
  };

  // 保存视觉与字体风格设置
  const handleSaveSettings = async (newSettings: LandingSettings) => {
    setSettings(newSettings);
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/booking-landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings", ...newSettings }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("视觉风格已更新", "success");
      } else {
        showToast(data.error || "保存失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络异常", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // 手机模拟器当前展示的分类
  const activeCategories = categories.filter((c) => c.is_active === 1);
  const currentPreviewItem = activeCategories[previewIndex] || activeCategories[0] || categories[0];

  return (
    <div className="space-y-6">
      {/* 头部标题区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#8E1728] tracking-wide uppercase">
            MINIPROGRAM TAB 3 · 开始约课
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">
            约课首屏分类与沉浸式大片管理
          </h1>
          <p className="text-sm text-[#697180] mt-1">
            自由控制小程序「开始约课」首屏的垂直分类胶囊、顺序、9:16 全屏实拍背景大片、预约主按钮文案与视觉字体风格。
          </p>
        </div>

        <button
          onClick={() =>
            setEditingItem({
              name: "",
              short_name: "",
              tagline: "",
              button_text: "",
              image_url: "",
              sort_order: categories.length + 1,
              is_active: 1,
            })
          }
          className="px-4 py-2 text-xs font-medium text-white bg-[#8E1728] hover:bg-[#721220] rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 新增课程分类
        </button>
      </div>

      {/* 视觉风格控制条 */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#F0F2F5] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#8E1728]" />
            <h3 className="text-sm font-semibold text-[#292D35]">首屏视觉呈现方式与字体风格</h3>
          </div>
          {savingSettings && (
            <span className="text-xs text-[#697180] flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 保存中...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* 字体风格 */}
          <div>
            <label className="text-xs font-medium text-[#4B5563] block mb-1.5 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-[#8E1728]" /> 标题字体气质
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "song", label: "宋体雅致", desc: "轻奢高雅" },
                { key: "sans", label: "现代黑体", desc: "极简力量" },
                { key: "serif", label: "衬线经典", desc: "柔美舒展" },
              ].map((font) => (
                <button
                  key={font.key}
                  type="button"
                  onClick={() => handleSaveSettings({ ...settings, font_family: font.key })}
                  className={`p-2 rounded-lg text-left border text-xs transition-all ${
                    settings.font_family === font.key
                      ? "border-[#8E1728] bg-[#FDF2F4] text-[#8E1728] font-semibold ring-1 ring-[#8E1728]"
                      : "border-[#E1E5EB] hover:bg-gray-50 text-[#4B5563]"
                  }`}
                >
                  <div className="font-medium">{font.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{font.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 胶囊质感 */}
          <div>
            <label className="text-xs font-medium text-[#4B5563] block mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#8E1728]" /> 垂直胶囊质感
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { key: "glass", label: "毛玻璃", desc: "微光半透" },
                { key: "pill", label: "高级柔白", desc: "温润通透" },
                { key: "solid", label: "极简实色", desc: "清晰纯净" },
              ].map((style) => (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => handleSaveSettings({ ...settings, capsule_style: style.key })}
                  className={`p-2 rounded-lg text-left border text-xs transition-all ${
                    settings.capsule_style === style.key
                      ? "border-[#8E1728] bg-[#FDF2F4] text-[#8E1728] font-semibold ring-1 ring-[#8E1728]"
                      : "border-[#E1E5EB] hover:bg-gray-50 text-[#4B5563]"
                  }`}
                >
                  <div className="font-medium">{style.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 标语副标题开关 */}
          <div>
            <label className="text-xs font-medium text-[#4B5563] block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8E1728]" /> 专属标语副标题
            </label>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() =>
                  handleSaveSettings({
                    ...settings,
                    show_tagline: settings.show_tagline === 1 ? 0 : 1,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.show_tagline === 1 ? "bg-[#8E1728]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.show_tagline === 1 ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-xs text-[#4B5563]">
                {settings.show_tagline === 1 ? "显示分类专属诗意标语" : "保持极致极简（仅展示按钮）"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 核心工作区：左侧分类卡片列表，右侧手机 1:1 动态画报模拟器 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 左侧：分类管理卡片 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-[#697180]">
            <span>共 {categories.length} 个课程板块（点击“预览”可在右侧模拟器实时查看背景与胶囊）</span>
            <button
              onClick={fetchData}
              className="text-[#8E1728] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> 刷新列表
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500 bg-white border border-[#E1E5EB] rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#8E1728] mb-2" />
              正在加载约课首屏配置...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500 bg-white border border-[#E1E5EB] rounded-xl">
              暂无分类配置，点击上方“新增课程分类”添加
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((item, index) => {
                const isSelectedInPreview = currentPreviewItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl p-4 transition-all shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                      isSelectedInPreview
                        ? "border-[#8E1728] ring-1 ring-[#8E1728]/20 bg-[#FDFBFB]"
                        : "border-[#E1E5EB] hover:border-gray-300"
                    }`}
                  >
                    {/* 封面缩略图 */}
                    <div
                      onClick={() => {
                        const actIdx = activeCategories.findIndex((c) => c.id === item.id);
                        if (actIdx >= 0) setPreviewIndex(actIdx);
                      }}
                      className="relative w-20 h-28 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-gray-100 cursor-pointer group shadow-inner"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                          暂无图片
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium">
                        预览
                      </div>
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        #{item.sort_order}
                      </div>
                    </div>

                    {/* 信息区 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#FDF2F4] text-[#8E1728] border border-[#FAD2D8]">
                          {item.short_name}
                        </span>
                        <h4 className="text-sm font-semibold text-[#292D35] truncate">{item.name}</h4>
                        {item.is_active === 1 ? (
                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Eye className="w-3 h-3" /> 展示中
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <EyeOff className="w-3 h-3" /> 已隐藏
                          </span>
                        )}
                      </div>

                      {item.tagline && (
                        <p className="text-xs text-[#697180] mt-1.5 truncate">标语：{item.tagline}</p>
                      )}
                      <p className="text-xs text-[#8E1728] mt-1">主按钮：{item.button_text || `预约${item.name}`}</p>
                    </div>

                    {/* 操作按钮区 */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* 上下移排序 */}
                      <button
                        title="上移"
                        disabled={index === 0}
                        onClick={() => handleMoveOrder(index, "up")}
                        className="p-1.5 rounded-lg border border-[#E1E5EB] hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white text-gray-600"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="下移"
                        disabled={index === categories.length - 1}
                        onClick={() => handleMoveOrder(index, "down")}
                        className="p-1.5 rounded-lg border border-[#E1E5EB] hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white text-gray-600"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* 编辑 */}
                      <button
                        title="编辑"
                        onClick={() => setEditingItem(item)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#E1E5EB] hover:bg-gray-100 text-xs text-[#292D35] flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" /> 编辑
                      </button>

                      {/* 删除 */}
                      <button
                        title="删除"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg border border-[#E1E5EB] hover:bg-rose-50 hover:border-rose-200 text-gray-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧：1:1 动态手机模拟器 */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="bg-white border border-[#E1E5EB] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#8E1728]" />
                <span className="text-xs font-semibold text-[#292D35]">iPhone 1:1 实时真机画报预览</span>
              </div>
              <span className="text-[11px] text-gray-400">点击胶囊切换背景</span>
            </div>

            {/* 模拟器外壳 */}
            <div className="mt-4 mx-auto w-[290px] h-[580px] rounded-[42px] bg-[#1A1A1A] p-2.5 shadow-2xl relative select-none">
              {/* 屏幕内腔 */}
              <div className="w-full h-full rounded-[34px] overflow-hidden relative flex flex-col justify-between bg-black">
                {/* 动态全屏 9:16 实拍背景 */}
                {currentPreviewItem?.image_url ? (
                  <img
                    src={currentPreviewItem.image_url}
                    alt="背景预览"
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-b from-stone-900 to-black" />
                )}

                {/* 柔暗渐变层，保证文字胶囊清晰 */}
                <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                {/* 顶部状态栏与品牌字样 */}
                <div className="relative z-10 pt-4 px-5 flex items-center justify-between text-white/80">
                  <span
                    className={`text-[11px] tracking-[0.2em] font-medium uppercase ${
                      settings.font_family === "song" ? "font-serif" : "font-sans"
                    }`}
                  >
                    LAIWU PILATES
                  </span>
                  <div className="text-[10px] bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-white/90">
                    我的预约
                  </div>
                </div>

                {/* 底部控制交互区 */}
                <div className="relative z-10 pb-4 px-4 space-y-3.5">
                  {/* 垂直胶囊排列（横向滑动排布） */}
                  <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                    {activeCategories.map((cat, idx) => {
                      const isActive = (activeCategories[previewIndex]?.id || activeCategories[0]?.id) === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPreviewIndex(idx)}
                          className={`w-10 py-2.5 rounded-full text-center transition-all flex flex-col items-center justify-center ${
                            isActive
                              ? "bg-white text-[#8E1728] shadow-lg scale-105 font-bold"
                              : settings.capsule_style === "glass"
                              ? "bg-white/25 backdrop-blur-md text-white/90 border border-white/30"
                              : settings.capsule_style === "pill"
                              ? "bg-white/40 backdrop-blur-sm text-white"
                              : "bg-white/80 text-stone-800"
                          }`}
                        >
                          {cat.short_name.split("").map((ch, i) => (
                            <span key={i} className="text-[11px] leading-tight block">
                              {ch}
                            </span>
                          ))}
                        </button>
                      );
                    })}
                  </div>

                  {/* 页码指示器与标语 */}
                  <div className="text-center">
                    <div className="text-[10px] text-white/70 font-mono">
                      {Math.min(previewIndex + 1, activeCategories.length)} / {activeCategories.length}
                    </div>
                    {settings.show_tagline === 1 && currentPreviewItem?.tagline && (
                      <p className="text-[10px] text-white/90 mt-0.5 tracking-wider truncate px-2 font-light">
                        {currentPreviewItem.tagline}
                      </p>
                    )}
                  </div>

                  {/* 预约主按钮 */}
                  <button
                    type="button"
                    className="w-full py-2.5 rounded-full bg-white text-[#8E1728] text-xs font-semibold shadow-lg text-center tracking-wide active:scale-98 transition-transform"
                  >
                    {currentPreviewItem?.button_text || `预约${currentPreviewItem?.name || "课程"}`}
                  </button>

                  {/* 底部 5 个 Tab 栏仿真 */}
                  <div className="bg-[#FAF2EB]/95 backdrop-blur-md rounded-full py-1.5 px-3 flex items-center justify-between text-[8px] text-stone-600 shadow-sm border border-stone-200">
                    <span className="opacity-70">徕舞之星</span>
                    <span className="opacity-70">了解徕舞</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded-full font-semibold">开始约课</span>
                    <span className="opacity-70">我的蜕变</span>
                    <span className="opacity-70">我的账户</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑 / 新增抽屉弹窗 */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-semibold text-[#292D35]">
                {editingItem.id ? "编辑课程分类与大片" : "录入新课程分类"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              {/* 课程全称 */}
              <div>
                <label className="font-medium text-[#292D35] block mb-1">
                  课程全称 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：精品普拉提、维密减脂超模班"
                  value={editingItem.name || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E1E5EB] rounded-lg focus:outline-hidden focus:border-[#8E1728]"
                />
              </div>

              {/* 胶囊简称 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-[#292D35] block mb-1">
                    胶囊简称 (2-3字为佳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="如：普拉提、私教"
                    value={editingItem.short_name || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, short_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E1E5EB] rounded-lg focus:outline-hidden focus:border-[#8E1728]"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">展示在手机端竖向垂直胶囊内</p>
                </div>

                <div>
                  <label className="font-medium text-[#292D35] block mb-1">排序序号</label>
                  <input
                    type="number"
                    min={1}
                    value={editingItem.sort_order || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-[#E1E5EB] rounded-lg focus:outline-hidden focus:border-[#8E1728]"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">数字越小排在越前面</p>
                </div>
              </div>

              {/* 专属标语副标题 */}
              <div>
                <label className="font-medium text-[#292D35] block mb-1">专属诗意标语 (选填)</label>
                <input
                  type="text"
                  placeholder="如：精准肌肉对位 · 脊柱深层节律延伸"
                  value={editingItem.tagline || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E1E5EB] rounded-lg focus:outline-hidden focus:border-[#8E1728]"
                />
              </div>

              {/* 主按钮文案 */}
              <div>
                <label className="font-medium text-[#292D35] block mb-1">预约主按钮文案 (选填)</label>
                <input
                  type="text"
                  placeholder={editingItem.name ? `预约${editingItem.name}` : "预约全部课程"}
                  value={editingItem.button_text || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, button_text: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E1E5EB] rounded-lg focus:outline-hidden focus:border-[#8E1728]"
                />
              </div>

              {/* 9:16 全屏实拍背景大片 */}
              <div>
                <label className="font-medium text-[#292D35] block mb-1">
                  9:16 全屏实拍背景大片 <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    placeholder="https://... 或 /images/categories/all.jpg"
                    value={editingItem.image_url || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                    className="flex-1 px-3 py-2 border border-[#E1E5EB] rounded-lg focus:outline-hidden focus:border-[#8E1728]"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    上传新大片
                  </button>
                </div>
                {editingItem.image_url && (
                  <div className="mt-2 w-28 h-40 rounded-lg overflow-hidden border border-gray-200 bg-black">
                    <img
                      src={editingItem.image_url}
                      alt="预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* 显示状态 */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editingItem.is_active === 1}
                  onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-300 text-[#8E1728] focus:ring-[#8E1728]"
                />
                <label htmlFor="isActiveToggle" className="font-medium text-[#292D35]">
                  在小程序「开始约课」首屏显示该分类
                </label>
              </div>

              {/* 弹窗底部操作 */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-[#E1E5EB] rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-4 py-2 bg-[#8E1728] hover:bg-[#721220] text-white rounded-lg flex items-center gap-1.5 font-medium shadow-sm transition-colors"
                >
                  {savingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
