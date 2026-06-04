"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const inputClass = "border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";
const selectClass = `flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors ${inputClass}`;

export default function UploadPhoto() {
  const router = useRouter();
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    photoType: "progress",
    takenAt: new Date().toISOString().slice(0, 10),
  });
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("请选择照片文件");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("memberId", String(memberId));
    formData.append("photoType", form.photoType);
    formData.append("takenAt", form.takenAt);
    formData.append("file", file);

    const res = await fetch("/api/photos", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      router.push(`/members/${memberId}/photos`);
    } else {
      const err = await res.json();
      setError(err.error || "上传失败");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-serif tracking-wide mb-8">上传照片</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm">照片类型</label>
              <select
                name="photoType"
                value={form.photoType}
                onChange={e => setForm({ ...form, photoType: e.target.value })}
                className={selectClass}
              >
                <option value="body">体型</option>
                <option value="posture">体态</option>
                <option value="progress">进度</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm">拍摄日期</label>
              <Input
                name="takenAt"
                type="date"
                value={form.takenAt}
                onChange={e => setForm({ ...form, takenAt: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm">选择照片 *</label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={inputClass}
            />
          </div>

          {preview && (
            <div className="border border-[#E8E0D5] rounded p-2">
              <img src={preview} alt="预览" className="max-h-64 rounded mx-auto" />
            </div>
          )}

          {error && <p className="text-sm text-[#D4736A]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "上传中..." : "上传"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
