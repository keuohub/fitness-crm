"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";

const selectClass = `flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm transition-colors ${inputClass}`;

export default function NewMember() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "female",
    stage: "",
    tags: "",
    status: "active",
    joinedAt: new Date().toISOString().slice(0, 10),
    birthday: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("姓名不能为空");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender,
        stage: form.stage || undefined,
        tags: form.tags.trim() || undefined,
        status: form.status,
        joinedAt: form.joinedAt || undefined,
        birthday: form.birthday || undefined,
        // memberCode 不传，后端自动生成
      }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError("提交失败，请重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-serif font-bold tracking-wide mb-2">新增会员</h1>
        <p className="text-sm text-[#9E8E7E] mb-8">会员编号将在保存后自动生成</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 姓名(2/3) + 性别(1/3) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">姓名 *</label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="请输入姓名"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">性别</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="female">女</option>
                <option value="male">男</option>
              </select>
            </div>
          </div>

          {/* 手机号 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#9E8E7E]">手机号</label>
            <Input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="请输入手机号"
              className={inputClass}
            />
          </div>

          {/* 生日 + 加入时间 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">生日</label>
              <Input
                name="birthday"
                type="date"
                value={form.birthday}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">加入时间</label>
              <Input
                name="joinedAt"
                type="date"
                value={form.joinedAt}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* 阶段 + 状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">会员阶段</label>
              <select
                name="stage"
                value={form.stage}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">请选择</option>
                <option value="new">新会员</option>
                <option value="active">活跃</option>
                <option value="regular">常客</option>
                <option value="at_risk">流失风险</option>
                <option value="churned">已流失</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">状态</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="active">在籍</option>
                <option value="inactive">停课</option>
                <option value="archived">归档</option>
              </select>
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#9E8E7E]">标签（逗号分隔）</label>
            <Input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="腰痛, 产后, 体态矫正"
              className={inputClass}
            />
          </div>

          {/* 编号提示 */}
          <div className="flex items-center gap-2 text-xs text-[#9E8E7E] bg-[#FAF7F2] rounded-lg px-3 py-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            会员编号将在保存后自动生成
          </div>

          {/* 错误提示 */}
          {error && <p className="text-sm text-[#D4736A]">{error}</p>}

          {/* 按钮 */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="bg-[#8B5E3C] hover:bg-[#A86545] text-white rounded-xl">
              {submitting ? "保存中..." : "保存"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl">
              取消
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
