"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const labelClass = "text-xs text-[#9E8E7E]";
const valueClass = "text-sm text-[#3E2723]";
const fieldClass = "space-y-0.5";
const sectionClass = "bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm";
const sectionTitleClass = "font-serif text-base text-[#3E2723] border-b border-[#E8E0D5] pb-2 mb-3";
const selectClass = "flex h-9 rounded-md border border-[#E8E0D5] bg-white px-3 py-1 text-sm shadow-sm focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";

function FieldRow({ label, value, fallback = "-" }: { label: string; value: string | number | null; fallback?: string }) {
  const display = value !== null && value !== undefined && value !== "" ? String(value) : fallback;
  return (
    <div className={fieldClass}>
      <span className={labelClass}>{label}</span>
      <p className={valueClass}>{display}</p>
    </div>
  );
}

const painLabels: Record<string, string> = { "无": "无", "轻微": "轻微", "中等": "中等", "严重": "严重" };
const freqLabels: Record<string, string> = { "从不": "从不", "偶尔": "偶尔", "经常": "经常", "总是": "总是" };

interface Questionnaire {
  id: number;
  submittedAt: string;
  name: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  avgSleep: number | null;
  occupation: string | null;
  workStatus: string | null;
  exerciseFrequency: string | null;
  mainConcern: string | null;
  edema: string | null;
  fatigue: string | null;
  shoulderNeckPain: string | null;
  backPain: string | null;
  lowEnergy: string | null;
  constipation: string | null;
  sedentary: string | null;
  anxiety: string | null;
  bedtime: string | null;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  takeout: string | null;
  sugaryDrinks: string | null;
  lateSnack: string | null;
  bingeTime: string | null;
  dietHistory: string | null;
  waterIntake: string | null;
  cravings: string | null;
  menstrualRegular: string | null;
  menstrualBinge: string | null;
  menstrualEdema: string | null;
  desiredState: string | null;
  commitment: string | null;
}

export default function QuestionnaireView() {
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [memberName, setMemberName] = useState("");
  const [records, setRecords] = useState<Questionnaire[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/members`).then(r => r.json()),
      fetch(`/api/questionnaire?memberId=${memberId}`).then(r => r.json()),
    ]).then(([membersData, qData]) => {
      const member = (membersData as { id: number; name: string }[]).find(m => m.id === memberId);
      if (member) setMemberName(member.name);
      const qs = qData as Questionnaire[];
      setRecords(qs);
      if (qs.length > 0) setSelectedId(qs[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [memberId]);

  const selected = records.find(r => r.id === selectedId) ?? null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-[#9E8E7E]">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-3xl mx-auto">
        {/* 面包屑 + 按钮 */}
        <div className="flex items-center justify-between mb-6">
          <Link href={`/members/${memberId}`} className="text-sm text-[#9E8E7E] hover:underline">
            ← 返回会员详情
          </Link>
          <Button asChild size="sm">
            <Link href={`/members/${memberId}/questionnaire/new`}>新增问卷</Link>
          </Button>
        </div>

        {/* 标题 + 版本选择 */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-2xl font-serif tracking-wide">会员问卷 · {memberName}</h1>
          {records.length > 1 && (
            <select
              className={selectClass}
              value={selectedId ?? ""}
              onChange={e => setSelectedId(parseInt(e.target.value, 10))}
            >
              {records.map(r => (
                <option key={r.id} value={r.id}>
                  {r.submittedAt}
                </option>
              ))}
            </select>
          )}
        </div>

        {!selected ? (
          <div className="bg-white rounded-2xl border border-[#E8E0D5] p-8 shadow-sm text-center">
            <p className="text-[#9E8E7E] mb-4">暂无问卷记录</p>
            <Button asChild>
              <Link href={`/members/${memberId}/questionnaire/new`}>填写第一份问卷</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── 一、基本信息 ── */}
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>一、基本信息</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FieldRow label="姓名" value={selected.name} />
                <FieldRow label="年龄" value={selected.age} />
                <FieldRow label="身高" value={selected.height ? `${selected.height}cm` : null} />
                <FieldRow label="体重" value={selected.weight ? `${selected.weight}kg` : null} />
                <FieldRow label="职业" value={selected.occupation} />
                <FieldRow label="工作状态" value={selected.workStatus} />
                <FieldRow label="运动频率" value={selected.exerciseFrequency} />
              </div>
              {selected.mainConcern && (
                <div className="mt-3">
                  <span className={labelClass}>主要困扰</span>
                  <p className={`${valueClass} whitespace-pre-wrap`}>{selected.mainConcern}</p>
                </div>
              )}
            </div>

            {/* ── 二、身体状态 ── */}
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>二、身体状态</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FieldRow label="水肿情况" value={selected.edema} />
                <FieldRow label="疲劳感" value={selected.fatigue && freqLabels[selected.fatigue] ? freqLabels[selected.fatigue] : selected.fatigue} />
                <FieldRow label="肩颈疼痛" value={selected.shoulderNeckPain && painLabels[selected.shoulderNeckPain] ? painLabels[selected.shoulderNeckPain] : selected.shoulderNeckPain} />
                <FieldRow label="腰痛" value={selected.backPain && painLabels[selected.backPain] ? painLabels[selected.backPain] : selected.backPain} />
                <FieldRow label="精力不足" value={selected.lowEnergy && freqLabels[selected.lowEnergy] ? freqLabels[selected.lowEnergy] : selected.lowEnergy} />
                <FieldRow label="便秘" value={selected.constipation} />
                <FieldRow label="每日久坐时长" value={selected.sedentary} />
                <FieldRow label="日均睡眠" value={selected.avgSleep ? `${selected.avgSleep}小时` : null} />
              </div>
            </div>

            {/* ── 三、心理 & 睡眠 ── */}
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>三、心理 & 睡眠</h2>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="焦虑程度" value={selected.anxiety && freqLabels[selected.anxiety] ? freqLabels[selected.anxiety] : selected.anxiety} />
                <FieldRow label="就寝时间" value={selected.bedtime} />
              </div>
            </div>

            {/* ── 四、饮食习惯 ── */}
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>四、饮食习惯</h2>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="早餐" value={selected.breakfast} />
                <FieldRow label="午餐" value={selected.lunch} />
                <FieldRow label="晚餐" value={selected.dinner} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                <FieldRow label="外卖频率" value={selected.takeout} />
                <FieldRow label="含糖饮料" value={selected.sugaryDrinks} />
                <FieldRow label="夜宵" value={selected.lateSnack && freqLabels[selected.lateSnack] ? freqLabels[selected.lateSnack] : selected.lateSnack} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FieldRow label="暴食时段" value={selected.bingeTime} />
                <FieldRow label="每日饮水量" value={selected.waterIntake} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <FieldRow label="食欲偏好" value={selected.cravings} />
              </div>
              {selected.dietHistory && (
                <div className="mt-3">
                  <span className={labelClass}>节食/减肥史</span>
                  <p className={`${valueClass} whitespace-pre-wrap`}>{selected.dietHistory}</p>
                </div>
              )}
            </div>

            {/* ── 五、经期情况 ── */}
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>五、经期情况</h2>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="月经规律" value={selected.menstrualRegular} />
                <FieldRow label="经期暴食" value={selected.menstrualBinge} />
                <FieldRow label="经期水肿" value={selected.menstrualEdema} />
              </div>
            </div>

            {/* ── 六、目标期望 ── */}
            <div className={sectionClass}>
              <h2 className={sectionTitleClass}>六、目标期望</h2>
              <div className="space-y-3">
                <FieldRow label="改变的决心" value={selected.commitment} />
                {selected.desiredState && (
                  <div>
                    <span className={labelClass}>期望达到的状态</span>
                    <p className={`${valueClass} whitespace-pre-wrap`}>{selected.desiredState}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
