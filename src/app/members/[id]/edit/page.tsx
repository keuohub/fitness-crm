"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const inputClass =
  "border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";

const selectClass = `flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm transition-colors ${inputClass}`;

interface Member {
  id: number;
  name: string;
  phone: string | null;
  gender: string | null;
  stage: string | null;
  tags: string | null;
  memberCode: string | null;
  status: string;
  joinedAt: string | null;
  birthday: string | null;
}

export default function EditMember() {
  const router = useRouter();
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [memberCode, setMemberCode] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "female",
    stage: "",
    tags: "",
    status: "active",
    joinedAt: "",
    birthday: "",
  });

  useEffect(() => {
    fetch(`/api/members/${memberId}`)
      .then((r) => r.json())
      .then((data: Member) => {
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          gender: data.gender || "female",
          stage: data.stage || "",
          tags: data.tags
            ? (() => {
                try {
                  return (JSON.parse(data.tags) as string[]).join(", ");
                } catch {
                  return data.tags;
                }
              })()
            : "",
          status: data.status || "active",
          joinedAt: data.joinedAt || "",
          birthday: data.birthday || "",
        });
        setMemberCode(data.memberCode || "自动生成中...");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [memberId]);

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
    const res = await fetch(`/api/members/${memberId}`, {
      method: "PUT",
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
      }),
    });

    if (res.ok) {
      router.push(`/members/${memberId}`);
    } else {
      setError("保存失败，请重试");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
        <div className="max-w-xl mx-auto">
          <div className="h-96 bg-[#FAF7F2] rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link href={`/members/${memberId}`} className="text-sm text-[#9E8E7E] hover:text-[#3E2723]">
            ← 返回会员详情
          </Link>
        </div>

        <h1 className="text-2xl font-serif font-bold tracking-wide mb-2">编辑会员</h1>
        <p className="text-sm text-[#9E8E7E] mb-8">编号 {memberCode}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 姓名 + 性别 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">姓名 *</label>
              <Input name="name" value={form.name} onChange={handleChange} required className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">性别</label>
              <select name="gender" value={form.gender} onChange={handleChange} className={selectClass}>
                <option value="female">女</option>
                <option value="male">男</option>
              </select>
            </div>
          </div>

          {/* 手机号 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#9E8E7E]">手机号</label>
            <Input name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
          </div>

          {/* 生日 + 加入时间 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">生日</label>
              <Input name="birthday" type="date" value={form.birthday} onChange={handleChange} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">加入时间</label>
              <Input name="joinedAt" type="date" value={form.joinedAt} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          {/* 阶段 + 状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm text-[#9E8E7E]">会员阶段</label>
              <select name="stage" value={form.stage} onChange={handleChange} className={selectClass}>
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
              <select name="status" value={form.status} onChange={handleChange} className={selectClass}>
                <option value="active">在籍</option>
                <option value="inactive">停课</option>
                <option value="archived">归档</option>
              </select>
            </div>
          </div>

          {/* 标签 */}
          <div className="space-y-1.5">
            <label className="text-sm text-[#9E8E7E]">标签（逗号分隔）</label>
            <Input name="tags" value={form.tags} onChange={handleChange} placeholder="腰痛, 产后, 体态矫正" className={inputClass} />
          </div>

          {/* 编号只读 */}
          <div className="flex items-center gap-2 text-xs text-[#9E8E7E] bg-[#FAF7F2] rounded-lg px-3 py-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            会员编号 {memberCode} · 不可修改
          </div>

          {error && <p className="text-sm text-[#D4736A]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="bg-[#8B5E3C] hover:bg-[#A86545] text-white rounded-xl">
              {submitting ? "保存中..." : "保存修改"}
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
