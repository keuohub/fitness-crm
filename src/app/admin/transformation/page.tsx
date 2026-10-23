"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/admin/Toast";
import {
  User,
  Plus,
  Upload,
  Edit2,
  Trash2,
  X,
  Search,
  Sparkles,
  ArrowRight,
  Quote,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

interface Member {
  id: number;
  name: string;
  phone: string | null;
  joinedAt: string | null;
}

interface PostureCompare {
  id: number;
  member_id: number;
  photo1_url: string;
  photo2_url: string;
  photo1_type: string;
  photo2_type: string;
  photo1_date: string;
  photo2_date: string;
  analysis: string;
  created_at: string;
}

const angleMap: Record<string, string> = {
  front: "正面体态",
  side: "侧面力学",
  back: "背面脊柱",
};

export default function AdminTransformationPage() {
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [comparisons, setComparisons] = useState<PostureCompare[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Partial<PostureCompare> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading1, setUploading1] = useState(false);
  const [uploading2, setUploading2] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMembers(data);

        let targetId: number | null = null;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const midParam = params.get("memberId");
          if (midParam && !isNaN(Number(midParam))) {
            targetId = Number(midParam);
          }
        }

        if (!targetId) {
          // 不再写死某个真实会员：未指定 memberId 时只按列表第一条兜底
          if (!data.length) {
            throw new Error("还没有会员数据");
          }
          targetId = data[0].id;
        }

        setSelectedMemberId(targetId);
      }
    } catch (err: any) {
      showToast(err.message || "读取会员列表失败", "error");
    }
  };

  const fetchComparisons = async (mid: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/photo-compare?memberId=${mid}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setComparisons(data);
      }
    } catch (err: any) {
      showToast(err.message || "读取体态对比档案失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchComparisons(selectedMemberId);
    }
  }, [selectedMemberId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !editingItem?.photo1_url || !editingItem?.photo2_url) {
      showToast("请上传入学初测照与进阶定格照两张大片", "error");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingItem.id;
      const res = await fetch("/api/admin/photo-compare", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingItem,
          memberId: selectedMemberId,
        }),
      });
      if (res.ok) {
        setEditingItem(null);
        showToast("体态档案已成功保存并同步至该学员小程序端", "success");
        await fetchComparisons(selectedMemberId);
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
      const res = await fetch(`/api/admin/photo-compare?id=${deleteConfirmId}`, {
        method: "DELETE",
      });
      if (res.ok && selectedMemberId) {
        setDeleteConfirmId(null);
        showToast("已成功删除该条体态对比记录", "success");
        await fetchComparisons(selectedMemberId);
      } else {
        showToast("删除失败", "error");
      }
    } catch (err: any) {
      showToast(err.message || "网络请求异常", "error");
    }
  };

  const handleUploadPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "photo1_url" | "photo2_url",
    setUploadState: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/photos", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setEditingItem((prev) => ({ ...prev, [field]: data.url }));
        showToast("体态大片已成功上传", "success");
        if (data.warning) showToast(data.warning, "error");
      } else {
        showToast(data.error || "上传失败", "error");
      }
    } catch {
      showToast("上传网络异常", "error");
    } finally {
      setUploadState(false);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2563EB] tracking-wide uppercase">
            MINIPROGRAM TAB 3 · 我的蜕变档案
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">体态对比与阶段测评</h1>
          <p className="text-sm text-[#697180] mt-1">
            为每位学员建立私密专属的体态档案。入学初测与进阶定格并置对比，由小桥导师撰写体态力学分析。
          </p>
        </div>

        <button
          onClick={() =>
            setEditingItem({
              photo1_type: "front",
              photo2_type: "front",
              photo1_date: "入学初评阶段",
              photo2_date: "阶段进阶定格",
              photo1_url: "",
              photo2_url: "",
              analysis:
                "经过系统化核心与大器械精准力学纠正，骨盆回正对称，肋骨外翻显著改善，肩颈舒展挺拔。",
            })
          }
          className="px-4 py-2 text-xs font-medium text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" /> 录入新体态对比记录
        </button>
      </div>

      {/* Member Selector Bar */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-xs font-semibold text-[#292D35] flex items-center gap-1.5 shrink-0">
            <User className="w-4 h-4 text-[#2563EB]" /> 选择档案会员：
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索编号或姓名..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F5F7FA] border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] w-48 text-[#292D35]"
            />
          </div>

          <select
            value={selectedMemberId || ""}
            onChange={(e) => setSelectedMemberId(Number(e.target.value))}
            className="px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] font-medium text-[#292D35]"
          >
            {members
              .filter((m) => {
                if (!memberSearch.trim()) return true;
                const q = memberSearch.trim().toLowerCase();
                const code = `lw${m.id}`;
                const name = (m.name || "").toLowerCase();
                const phone = (m.phone || "").toLowerCase();
                return code.includes(q) || name.includes(q) || phone.includes(q);
              })
              .map((m) => (
                <option key={m.id} value={m.id}>
                  #LW{m.id} {m.name} {m.phone ? `(${m.phone})` : ""}
                </option>
              ))}
          </select>
        </div>

        {selectedMember && (
          <div className="flex items-center gap-2 text-xs text-[#697180]">
            <span>当前档案：<strong className="text-[#292D35]">{selectedMember.name}</strong></span>
            <span className="font-mono text-[#2563EB] bg-[#E8EEFF] px-1.5 py-0.5 rounded">
              #LW{selectedMember.id}
            </span>
            <span>•</span>
            <Link
              href={`/admin/members?memberId=${selectedMember.id}`}
              className="text-[#2563EB] hover:underline"
            >
              会员主卡
            </Link>
          </div>
        )}
      </div>

      {/* Comparisons List */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm">
            正在读取体态档案对比记录...
          </div>
        ) : comparisons.length === 0 ? (
          <div className="bg-white border border-[#E1E5EB] rounded-xl p-16 text-center text-[#697180] text-sm shadow-sm flex flex-col items-center justify-center">
            <Sparkles className="w-10 h-10 text-gray-300 mb-2" />
            <span className="font-semibold text-[#292D35]">
              {selectedMember ? selectedMember.name : "该会员"} 暂未录入体态蜕变对比
            </span>
            <span className="text-xs text-[#697180] mt-1">
              可点击右上角按钮上传初测照与进阶照，并填写导师诊断寄语。
            </span>
          </div>
        ) : (
          comparisons.map((c, idx) => (
            <div
              key={c.id}
              className="bg-white border border-[#E1E5EB] rounded-xl shadow-sm overflow-hidden"
            >
              {/* Record Top Bar */}
              <div className="p-4 bg-[#F8FAFC] border-b border-[#E1E5EB] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2563EB] bg-[#E8EEFF] px-2 py-0.5 rounded">
                    STAGE {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-[#292D35]">
                    {angleMap[c.photo1_type] || "多维体态"}对比
                  </span>
                  <span className="text-xs text-[#697180]">
                    录入于 {String(c.created_at || "").slice(0, 10)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingItem(c)}
                    className="p-1.5 text-gray-500 hover:text-[#2563EB] rounded hover:bg-gray-100 transition-colors"
                    title="编辑对比"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Side by Side Photos Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo 1: Initial */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#697180] uppercase tracking-wider font-mono">
                      FIG. 01 · 初测定格
                    </span>
                    <span className="text-[#697180]">{c.photo1_date || "入学阶段"}</span>
                  </div>
                  <div className="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden border border-[#E1E5EB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.photo1_url}
                      alt="initial posture"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] backdrop-blur-xs">
                      {angleMap[c.photo1_type] || "初测"}
                    </div>
                  </div>
                </div>

                {/* Photo 2: Advanced */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#2563EB] uppercase tracking-wider font-mono">
                      FIG. 02 · 蜕变定格
                    </span>
                    <span className="text-[#2563EB] font-medium">{c.photo2_date || "进阶阶段"}</span>
                  </div>
                  <div className="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden border border-[#2563EB]/30 ring-2 ring-[#2563EB]/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.photo2_url}
                      alt="advanced posture"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#2563EB]/90 text-white rounded text-[10px] backdrop-blur-xs font-medium">
                      {angleMap[c.photo2_type] || "进阶"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mentor Analysis Quote Card */}
              {c.analysis && (
                <div className="mx-6 mb-6 p-4 bg-[#F8FAFC] border-l-4 border-[#2563EB] rounded-r-xl">
                  <div className="text-xs font-semibold text-[#2563EB] mb-1 flex items-center gap-1">
                    <Quote className="w-3.5 h-3.5" />
                    小桥导师体态诊断与力学蜕变评语：
                  </div>
                  <p className="text-xs text-[#292D35] leading-relaxed whitespace-pre-wrap">
                    {c.analysis}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Drawer: Add / Edit Comparison */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setEditingItem(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-[#E1E5EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#292D35]">
                    {editingItem.id ? "编辑体态对比" : "录入体态阶段测评"}
                  </h3>
                  <p className="text-xs text-[#697180] mt-0.5">
                    为 {selectedMember?.name || "学员"} 上传对比照片，将在小程序「我的蜕变」专属呈现。
                  </p>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* 2 Photos Uploader Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Photo 1 */}
                  <div>
                    <label className="block text-xs font-medium text-[#292D35] mb-1">
                      初测定格照 (FIG. 01) *
                    </label>
                    <div className="relative aspect-[3/4] bg-gray-50 border-2 border-dashed border-[#E1E5EB] rounded-xl overflow-hidden flex flex-col items-center justify-center p-2 text-center">
                      {editingItem.photo1_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={editingItem.photo1_url}
                            alt="photo1"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingItem((p) => ({ ...p, photo1_url: "" }))}
                            className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-[11px] font-medium text-[#292D35]">
                            {uploading1 ? "正在上传..." : "上传初测照"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadPhoto(e, "photo1_url", setUploading1)}
                            disabled={uploading1}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <select
                        value={editingItem.photo1_type || "front"}
                        onChange={(e) => setEditingItem({ ...editingItem, photo1_type: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                      >
                        <option value="front">正面视角</option>
                        <option value="side">侧面视角</option>
                        <option value="back">背面视角</option>
                      </select>
                      <input
                        type="text"
                        placeholder="初测日期或阶段说明"
                        value={editingItem.photo1_date || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, photo1_date: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Photo 2 */}
                  <div>
                    <label className="block text-xs font-medium text-[#2563EB] mb-1">
                      进阶蜕变照 (FIG. 02) *
                    </label>
                    <div className="relative aspect-[3/4] bg-gray-50 border-2 border-dashed border-[#2563EB]/40 rounded-xl overflow-hidden flex flex-col items-center justify-center p-2 text-center">
                      {editingItem.photo2_url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={editingItem.photo2_url}
                            alt="photo2"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingItem((p) => ({ ...p, photo2_url: "" }))}
                            className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-[#2563EB] mb-1" />
                          <span className="text-[11px] font-medium text-[#2563EB]">
                            {uploading2 ? "正在上传..." : "上传进阶照"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadPhoto(e, "photo2_url", setUploading2)}
                            disabled={uploading2}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <select
                        value={editingItem.photo2_type || "front"}
                        onChange={(e) => setEditingItem({ ...editingItem, photo2_type: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                      >
                        <option value="front">正面视角</option>
                        <option value="side">侧面视角</option>
                        <option value="back">背面视角</option>
                      </select>
                      <input
                        type="text"
                        placeholder="进阶日期或阶段说明"
                        value={editingItem.photo2_date || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, photo2_date: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-[#E1E5EB] rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Analysis Commentary */}
                <div>
                  <label className="block text-xs font-medium text-[#292D35] mb-1">
                    小桥导师亲笔体态力学分析与寄语 *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="例如：经过 36 节大器械精准训练，骨盆前倾改善约 5°，肋骨外翻显著内敛归位，下颌与锁骨线条挺拔舒展..."
                    value={editingItem.analysis || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, analysis: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563EB] leading-relaxed"
                  />
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
                    {saving ? "正在发布..." : "发布体态档案"}
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
            <h3 className="text-base font-semibold text-[#292D35]">确认删除此条体态对比？</h3>
            <p className="text-xs text-[#697180] mt-1">
              删除后，学员小程序端将不再呈现该阶段的对比照片与评语。
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
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
