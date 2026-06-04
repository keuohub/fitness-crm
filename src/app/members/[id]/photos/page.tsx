"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Photo {
  id: number;
  filePath: string;
  photoType: string;
  takenAt: string | null;
}

const typeLabelMap: Record<string, string> = {
  body: "体型",
  posture: "体态",
  progress: "进度",
};

export default function PhotoList() {
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // 对比模式
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [compareView, setCompareView] = useState<{
    type: string;
    photos: [Photo, Photo];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/members`).then(r => r.json()),
      fetch(`/api/photos?memberId=${memberId}`).then(r => r.json()),
    ]).then(([membersData, pData]) => {
      const member = (membersData as { id: number; name: string }[]).find(m => m.id === memberId);
      if (member) setMemberName(member.name);
      setPhotos(pData as Photo[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [memberId]);

  // 按类型分组，每组内按拍摄时间排序
  const groups: Record<string, Photo[]> = {};
  photos.forEach(p => {
    const t = p.photoType || "progress";
    if (!groups[t]) groups[t] = [];
    groups[t].push(p);
  });
  // 每组按 takenAt 排序（有日期的在前）
  Object.keys(groups).forEach(t => {
    groups[t].sort((a, b) => {
      if (!a.takenAt) return 1;
      if (!b.takenAt) return -1;
      return a.takenAt.localeCompare(b.takenAt);
    });
  });

  const MAX_PER_TYPE = 2;

  const toggleSelect = (photo: Photo) => {
    const t = photo.photoType || "progress";
    const typePhotos = groups[t] || [];
    const currentInType = typePhotos.filter(p => selectedIds.has(p.id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        // 同类型最多选 2 张
        if (currentInType.length >= MAX_PER_TYPE) {
          // 移除最早选中的，加入新的
          const firstSelected = currentInType[0];
          next.delete(firstSelected.id);
        }
        next.add(photo.id);
      }
      return next;
    });
  };

  // 检测是否有某类型选满2张
  useEffect(() => {
    if (!compareMode || selectedIds.size < 2) {
      setCompareView(null);
      return;
    }

    for (const [type, items] of Object.entries(groups)) {
      const selected = items.filter(p => selectedIds.has(p.id));
      if (selected.length === 2) {
        // 左边早，右边晚
        const sorted = [...selected].sort((a, b) => {
          if (!a.takenAt) return 1;
          if (!b.takenAt) return -1;
          return a.takenAt.localeCompare(b.takenAt);
        });
        setCompareView({ type, photos: [sorted[0], sorted[1]] });
        return;
      }
    }
    setCompareView(null);
  }, [selectedIds, compareMode, groups]);

  const exitCompare = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
    setCompareView(null);
  };

  const canCompare = (type: string) => (groups[type] || []).length >= 2;

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/members/${memberId}`} className="text-sm text-[#9E8E7E] hover:underline">
            ← 返回会员详情
          </Link>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={compareMode ? "default" : "outline"}
              onClick={() => {
                if (compareMode) exitCompare();
                else setCompareMode(true);
              }}
            >
              {compareMode ? "退出对比" : "对比模式"}
            </Button>
            <Button asChild size="sm">
              <Link href={`/members/${memberId}/photos/upload`}>上传照片</Link>
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-serif tracking-wide mb-2">体态照片 · {memberName}</h1>
        <p className="text-sm text-[#9E8E7E] mb-8">
          {photos.length > 0 ? `共 ${photos.length} 张照片` : ""}
          {compareMode && ` · 每类型最多选 ${MAX_PER_TYPE} 张对比`}
        </p>

        {loading ? (
          <p className="text-sm text-[#9E8E7E]">加载中...</p>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E0D5] p-8 shadow-sm text-center">
            <p className="text-[#9E8E7E] mb-4">暂无照片记录</p>
            <Button asChild>
              <Link href={`/members/${memberId}/photos/upload`}>上传第一张照片</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([type, items]) => {
              const selectCount = items.filter(p => selectedIds.has(p.id)).length;
              const canComp = canCompare(type);

              return (
                <div key={type} className="bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E8E0D5] pb-2 mb-3">
                    <h2 className="font-serif text-base text-[#3E2723]">
                      {typeLabelMap[type] || type} · {items.length}张
                    </h2>
                    {compareMode && (
                      <span className="text-xs text-[#9E8E7E]">
                        {canComp
                          ? `已选 ${selectCount}/${MAX_PER_TYPE}`
                          : "不足两张，无法对比"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map(p => {
                      const isSelected = selectedIds.has(p.id);
                      const isDisabled = compareMode && !isSelected && selectCount >= MAX_PER_TYPE;

                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (compareMode) {
                              if (!isDisabled || isSelected) {
                                toggleSelect(p);
                              }
                            } else {
                              setSelectedPhoto(p);
                            }
                          }}
                          className={`relative group cursor-pointer ${
                            isDisabled && !isSelected ? "opacity-40" : ""
                          }`}
                        >
                          <img
                            src={p.filePath}
                            alt={p.takenAt || "照片"}
                            className={`w-full h-48 object-cover rounded border transition-all ${
                              isSelected
                                ? "border-[#3E2723] ring-2 ring-[#3E2723]/30"
                                : "border-[#E8E0D5]"
                            } group-hover:opacity-80`}
                          />

                          {/* 对比模式复选框 */}
                          {compareMode && (
                            <div
                              className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                                isSelected
                                  ? "bg-[#8B5E3C] border-[#8B5E3C] text-white"
                                  : "bg-white/80 border-[#E8E0D5]"
                              }`}
                            >
                              {isSelected ? "✓" : ""}
                            </div>
                          )}

                          {p.takenAt && (
                            <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                              {p.takenAt}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 对比视图 */}
        {compareView && (
          <div className="mt-6 bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm">
            <h2 className="font-serif text-base text-[#3E2723] border-b border-[#E8E0D5] pb-2 mb-4">
              对比视图 · {typeLabelMap[compareView.type] || compareView.type}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* 左：较早 */}
              <div>
                <p className="text-xs text-[#9E8E7E] mb-2 text-center">
                  {compareView.photos[0].takenAt || "未知日期"}
                </p>
                <button onClick={() => setSelectedPhoto(compareView.photos[0])}>
                  <img
                    src={compareView.photos[0].filePath}
                    alt="早期照片"
                    className="w-full h-64 object-cover rounded border border-[#E8E0D5] hover:opacity-80 transition-opacity"
                  />
                </button>
              </div>

              {/* 右：较晚 */}
              <div>
                <p className="text-xs text-[#9E8E7E] mb-2 text-center">
                  {compareView.photos[1].takenAt || "未知日期"}
                </p>
                <button onClick={() => setSelectedPhoto(compareView.photos[1])}>
                  <img
                    src={compareView.photos[1].filePath}
                    alt="近期照片"
                    className="w-full h-64 object-cover rounded border border-[#E8E0D5] hover:opacity-80 transition-opacity"
                  />
                </button>
              </div>
            </div>

            {/* 对比提示 */}
            <p className="text-xs text-[#9E8E7E] mt-3 text-center">
              点击照片可放大查看
            </p>

            {/* 并排 Dialog 大图对比 */}
            <Button
              size="sm"
              variant="outline"
              className="mt-3 mx-auto block"
              onClick={() => {
                setSelectedPhoto(compareView.photos[0]); // trigger dialog — 用自定义实现
              }}
            >
              放大对比
            </Button>
          </div>
        )}

        {/* 放大对比 Dialog */}
        {selectedPhoto && compareView && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="relative max-w-6xl w-full max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-8 right-0 text-white text-sm hover:underline z-10"
              >
                关闭
              </button>

              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col items-center">
                  <p className="text-white text-xs mb-2">
                    {compareView.photos[0].takenAt || "未知"}
                  </p>
                  <img
                    src={compareView.photos[0].filePath}
                    alt="早期"
                    className="max-w-full max-h-[75vh] object-contain rounded-lg"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-white text-xs mb-2">
                    {compareView.photos[1].takenAt || "未知"}
                  </p>
                  <img
                    src={compareView.photos[1].filePath}
                    alt="近期"
                    className="max-w-full max-h-[75vh] object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 普通放大 Dialog（非对比模式） */}
        {selectedPhoto && !compareView && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-8 right-0 text-white text-sm hover:underline"
              >
                关闭
              </button>
              <img
                src={selectedPhoto.filePath}
                alt={selectedPhoto.takenAt || "照片"}
                className="max-w-full max-h-[85vh] rounded-lg"
              />
              {selectedPhoto.takenAt && (
                <p className="text-white text-sm mt-2 text-center">
                  {selectedPhoto.takenAt} · {typeLabelMap[selectedPhoto.photoType] || selectedPhoto.photoType}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
