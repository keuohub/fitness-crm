"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const inputClass = "border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";
const selectClass = `flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors ${inputClass}`;

export default function NewTraining() {
  const router = useRouter();
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    trainingDate: new Date().toISOString().slice(0, 10),
    durationMinutes: "60",
    type: "private",
    focusArea: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.trainingDate) {
      setError("训练日期不能为空");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/trainings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        coachId: 1,
        trainingDate: form.trainingDate,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : null,
        type: form.type,
        focusArea: form.focusArea || null,
        notes: form.notes || null,
      }),
    });

    if (res.ok) {
      router.push(`/members/${memberId}/trainings`);
    } else {
      setError("提交失败，请重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-serif tracking-wide mb-8">新增训练</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm">训练日期 *</label>
              <Input name="trainingDate" type="date" value={form.trainingDate} onChange={handleChange} required className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm">时长（分钟）</label>
              <Input name="durationMinutes" type="number" value={form.durationMinutes} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm">类型</label>
            <select name="type" value={form.type} onChange={handleChange} className={selectClass}>
              <option value="private">私教</option>
              <option value="group">团课</option>
              <option value="assessment">评估</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm">重点部位</label>
            <Input name="focusArea" value={form.focusArea} onChange={handleChange} placeholder="如：核心、肩背、髋部" className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm">备注</label>
            <Textarea name="notes" value={form.notes} onChange={handleChange} placeholder="训练笔记、会员反馈等" className={`${inputClass} min-h-[80px]`} />
          </div>

          {error && <p className="text-sm text-[#D4736A]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "保存"}
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
