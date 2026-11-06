"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Star,
} from "lucide-react";

interface VenueItem {
  id: number;
  title: string;
  name?: string;
  tag?: string;
  desc?: string;
  imageUrl: string;
  images?: string[];
  imageCount?: number;
  sortOrder: number;
  isActive: number;
  createdAt: string;
}

interface StorageHealth {
  ok: boolean;
  storageType: string;
  bucket?: string;
  region?: string;
  message: string;
}

export default function AdminVenuePage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<VenueItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const drawerInputRef = useRef<HTMLInputElement | null>(null);

  const [sectionHeader, setSectionHeader] = useState({
    secNum: "01",
    secTitle: "场馆空间",
    secEn: "SPACES",
    secIntro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
  });
  const [savingHeader, setSavingHeader] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/venue");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err: any) {
      showToast(err.message || "读取场馆数据失败", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchItems();
    fetch("/api/admin/storage/health")
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => setHealth(null));
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
  }, [fetchItems]);

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
      if (res.ok) showToast("板块一标题与描述已同步小程序", "success");
      else showToast("保存失败，请重试", "error");
    } catch {
      showToast("网络请求异常", "error");
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = editingItem?.images || [];
    if (!editingItem?.title || list.length === 0) {
      showToast("请填写空间名称，并至少上传一张实景图", "error");
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
        showToast(isEdit ? "空间已更新" : "空间已新增，小程序端已同步", "success");
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
        showToast("空间已删除", "success");
        await fetchItems();
      } else {
        showToast("删除失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络异常", "error");
    }
  };

  /** 单文件上传，返回可用的图片 URL；失败时抛出中文原因 */
  const uploadOne = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/photos", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error || `上传失败（HTTP ${res.status}）`);
    }
    if (data.warning) showToast(data.warning, "error");
    return data.url as string;
  };

  /** 抽屉内：一次可多选，追加到当前空间的图片列表 */
  const handleDrawerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const added: string[] = [];
    const failed: string[] = [];
    for (const f of files) {
      try {
        added.push(await uploadOne(f));
      } catch (err: any) {
        failed.push(`${f.name}：${err.message}`);
      }
    }
    if (added.length > 0) {
      setEditingItem((prev) => {
        const current = prev?.images || [];
        const next = [...current, ...added];
        return { ...prev, images: next, imageUrl: next[0] || "" };
      });
      showToast(`已添加 ${added.length} 张实景图`, "success");
    }
    if (failed.length > 0) {
      showToast(failed[0], "error");
    }
    setUploading(false);
    if (drawerInputRef.current) drawerInputRef.current.value = "";
  };

  /** 卡片区：多选后，每张图自动成为一个空间条目，省去一条条建 */
  const handleBulkCreate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    let created = 0;
    let failMsg = "";
    for (const f of files) {
      try {
        const url = await uploadOne(f);
        const baseName = f.name.replace(/\.[^.]+$/, "").slice(0, 24) || "空间实景";
        const res = await fetch("/api/admin/venue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: baseName, images: [url], desc: "" }),
        });
        if (res.ok) created += 1;
        else {
          const d = await res.json().catch(() => ({}));
          failMsg = failMsg || d.error || "创建失败";
        }
      } catch (err: any) {
        failMsg = failMsg || err.message;
      }
    }
    if (created > 0) {
      showToast(`已新增 ${created} 个空间，点卡片可改名与调整顺序`, "success");
      await fetchItems();
    }
    if (failMsg) showToast(failMsg, "error");
    setUploading(false);
    if (bulkInputRef.current) bulkInputRef.current.value = "";
  };

  const removeImageAt = (index: number) => {
    setEditingItem((prev) => {
      const next = (prev?.images || []).filter((_, i) => i !== index);
      return { ...prev, images: next, imageUrl: next[0] || "" };
    });
  };

  const setCover = (index: number) => {
    setEditingItem((prev) => {
      const list = [...(prev?.images || [])];
      const [picked] = list.splice(index, 1);
      const next = [picked, ...list];
      return { ...prev, images: next, imageUrl: next[0] || "" };
    });
  };

  /** 上下移动后整串重排，避免手动填序号出现重复 */
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      const res = await fetch("/api/admin/venue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((i) => i.id) }),
      });
      if (!res.ok) showToast("排序保存失败", "error");
    } catch {
      showToast("排序保存失败", "error");
    }
  };

  const markBroken = (src: string) => {
    setBrokenIds((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 存储健康横幅：坏了先告诉运营，不要等传完图发现前台空白 */}
      {health && !health.ok && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-red-700">图片通道不可用，现在上传的图会员端会看不到</p>
            <p className="text-red-600 mt-0.5">{health.message}</p>
            <p className="text-red-500/90 mt-1">
              配置位置：studio_settings 表的 cos_bucket / cos_region / cos_secret_id / cos_secret_key。
            </p>
          </div>
        </div>
      )}
      {health && health.ok && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          图片存储正常（{health.bucket} · {health.region}），上传后会员端即时可见。
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MINIPROGRAM TAB 2 · 场馆空间实景
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">场馆空间与器械大片</h1>
          <p className="text-sm text-[#697180] mt-1">
            每个空间可放多张实景图，第 1 张为小程序封面。支持一次多选批量新增、任意删图、上下移排序。
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <input
            ref={bulkInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleBulkCreate}
            className="hidden"
          />
          <button
            onClick={() => bulkInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "上传中..." : "批量上传多张"}
          </button>
          <button
            onClick={() => {
              const nextOrder = items.length + 1;
              setEditingItem({
                title: "",
                name: "",
                tag: `${String(nextOrder).padStart(2, "0")} / 空间实景`,
                desc: "",
                imageUrl: "",
                images: [],
                sortOrder: nextOrder,
                isActive: 1,
              });
            }}
            className="px-4 py-2 text-xs font-medium text-[#292D35] bg-white border border-[#E1E5EB] hover:bg-[#F5F7FA] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> 新建空空间
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E1E5EB] shadow-xs overflow-x-auto">
        <Link href="/admin/brand" className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors">
          <Compass className="w-3.5 h-3.5" /> 品牌理念主视觉
        </Link>
        <Link href="/admin/venue" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#2563EB] text-white flex items-center gap-1.5 shrink-0 shadow-xs">
          <Building className="w-3.5 h-3.5" /> 场馆空间实景
        </Link>
        <Link href="/admin/team" className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors">
          <Users className="w-3.5 h-3.5" /> 同行导师团队
        </Link>
        <Link href="/admin/offerings" className="px-4 py-2 text-xs font-medium rounded-lg text-[#697180] hover:text-[#292D35] hover:bg-[#F5F7FA] flex items-center gap-1.5 shrink-0 transition-colors">
          <Layers className="w-3.5 h-3.5" /> 课程体系与底图
        </Link>
      </div>

      <form onSubmit={handleSaveHeader} className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2563EB] bg-[#E8EEFF] px-2 py-0.5 rounded">板块一顶部文案</span>
            <span className="text-xs text-[#292D35] font-medium">小程序「01 场馆空间」标题与指引描述</span>
          </div>
          <button type="submit" disabled={savingHeader} className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors">
            {savingHeader ? "保存中..." : "保存板块一文案"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">序号标号 (如 01)</label>
            <input type="text" value={sectionHeader.secNum} onChange={(e) => setSectionHeader({ ...sectionHeader, secNum: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">板块标题 (如 场馆空间)</label>
            <input type="text" value={sectionHeader.secTitle} onChange={(e) => setSectionHeader({ ...sectionHeader, secTitle: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#697180] mb-1">英文小标 (如 SPACES)</label>
            <input type="text" value={sectionHeader.secEn} onChange={(e) => setSectionHeader({ ...sectionHeader, secEn: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#697180] mb-1">板块介绍描述 (展示在标题下方的那句话)</label>
          <textarea rows={2} value={sectionHeader.secIntro} onChange={(e) => setSectionHeader({ ...sectionHeader, secIntro: e.target.value })} className="w-full px-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed" />
        </div>
      </form>

      {loading ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">正在读取空间相册...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
          <Building className="w-10 h-10 text-gray-300 mb-2" />
          <span className="font-semibold text-[#292D35]">暂无场馆空间大片</span>
          <span className="text-xs text-[#697180] mt-1">点击「批量上传多张」，一次选完所有实景图即可。</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, index) => {
            const isOnline = item.isActive === 1;
            const cover = item.images?.[0] || item.imageUrl;
            const count = item.imageCount ?? item.images?.length ?? (cover ? 1 : 0);
            const coverBroken = brokenIds.has(cover);
            return (
              <div key={item.id} className="bg-white border border-[#E1E5EB] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden group">
                  {coverBroken ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[11px] text-gray-400 gap-1 px-4 text-center">
                      <AlertTriangle className="w-5 h-5" />
                      图片地址打不开，请重新上传
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cover}
                      alt={item.title}
                      onError={() => markBroken(cover)}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs ${isOnline ? "bg-emerald-500/90 text-white" : "bg-gray-800/80 text-gray-300"}`}>
                      {isOnline ? "展示中" : "已隐藏"}
                    </span>
                    <span className="text-[10px] font-mono bg-black/50 text-white px-1.5 py-0.5 rounded">排序 {item.sortOrder}</span>
                  </div>
                  {count > 1 && (
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="text-[11px] font-medium bg-white/90 text-[#292D35] px-2 py-0.5 rounded-md shadow-xs">
                        共 {count} 张
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="text-[11px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-md">{item.tag || "01 / 空间实景"}</span>
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
                    {item.desc && <p className="text-xs text-[#697180] mt-1.5 leading-relaxed line-clamp-2">{item.desc}</p>}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F0F2F6] flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-[#292D35] rounded hover:bg-gray-100 disabled:opacity-30" title="上移">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="p-1.5 text-gray-400 hover:text-[#292D35] rounded hover:bg-gray-100 disabled:opacity-30" title="下移">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditingItem({ ...item, images: item.images || (cover ? [cover] : []) })} className="p-1.5 text-gray-500 hover:text-[#2563EB] rounded hover:bg-gray-100 transition-colors" title="编辑">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors" title="删除">
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

      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setEditingItem(null)} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">{editingItem.id ? "编辑空间相册" : "新建空间"}</h3>
                  <p className="text-xs text-[#697180] mt-0.5">可上传多张实景，第 1 张作为小程序封面。</p>
                </div>
                <button onClick={() => setEditingItem(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[#292D35]">
                      空间实景图 <span className="text-[#697180] font-normal">（{editingItem.images?.length || 0} 张，第一张为封面）</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => drawerInputRef.current?.click()}
                      disabled={uploading}
                      className="text-xs font-medium text-[#2563EB] hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {uploading ? "上传中" : "添加图片"}
                    </button>
                    <input ref={drawerInputRef} type="file" accept="image/*" multiple onChange={handleDrawerUpload} className="hidden" />
                  </div>

                  {(editingItem.images?.length || 0) === 0 ? (
                    <button
                      type="button"
                      onClick={() => drawerInputRef.current?.click()}
                      className="w-full aspect-[16/10] bg-gray-50 border-2 border-dashed border-[#E1E5EB] rounded-xl flex flex-col items-center justify-center gap-1 text-center"
                    >
                      <Upload className="w-7 h-7 text-gray-400" />
                      <span className="text-xs font-medium text-[#292D35]">点击上传实景图（可多选）</span>
                      <span className="text-[11px] text-[#697180]">JPG / PNG / WebP，单张 ≤ 5MB</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {(editingItem.images || []).map((src, i) => (
                        <div key={`${src}-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`实景 ${i + 1}`} className="w-full h-full object-cover" />
                          {i === 0 && (
                            <span className="absolute top-1 left-1 text-[10px] bg-[#2563EB] text-white px-1.5 py-0.5 rounded">封面</span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {i !== 0 && (
                              <button type="button" onClick={() => setCover(i)} title="设为封面" className="text-white/90 hover:text-white p-0.5">
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button type="button" onClick={() => removeImageAt(i)} title="删除这张" className="text-white/90 hover:text-red-300 p-0.5 ml-auto">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">
                    空间名称 * <span className="text-[#697180] font-normal">(小程序卡片标题)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：高定美学大器械 / 精品普拉提"
                    value={editingItem.title || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">左上角角标标签</label>
                  <input
                    type="text"
                    placeholder="例如：01 / 大器械实景"
                    value={editingItem.tag || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, tag: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">空间描述 (可选)</label>
                  <textarea
                    rows={3}
                    placeholder="例如：通透柔和自然采光，进口实木大器械。"
                    value={editingItem.desc || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, desc: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">展示状态</label>
                    <select
                      value={editingItem.isActive ?? 1}
                      onChange={(e) => setEditingItem({ ...editingItem, isActive: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value={1}>展示中</option>
                      <option value={0}>已隐藏</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">排序序号</label>
                    <input
                      type="number"
                      value={editingItem.sortOrder ?? 0}
                      onChange={(e) => setEditingItem({ ...editingItem, sortOrder: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#697180] leading-relaxed bg-[#F8FAFC] border border-[#E1E5EB] rounded-lg px-3 py-2">
                  排序也可以在卡片上直接点上下箭头，系统会整体重排，不会出现重复序号。
                </p>

                <div className="pt-4 border-t border-[#E1E5EB] flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-xs font-medium text-[#697180] hover:text-[#292D35] bg-white border border-[#E1E5EB] rounded-lg">
                    取消
                  </button>
                  <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50">
                    {saving ? "正在保存..." : "确认保存"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E1E5EB]">
            <h3 className="text-base font-semibold text-[#292D35]">确认删除该空间？</h3>
            <p className="text-xs text-[#697180] mt-1">删除后小程序端将不再呈现此空间，其下所有实景图一并移除。</p>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-xs text-[#697180] bg-white border border-[#E1E5EB] rounded-lg">取消</button>
              <button type="button" onClick={confirmDelete} className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
