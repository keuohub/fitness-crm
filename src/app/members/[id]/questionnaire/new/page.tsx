"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const inputClass =
  "border-[#E8E0D5] focus-visible:border-[#8B5E3C] focus-visible:ring-[#8B5E3C]/20";

const selectClass = `flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors ${inputClass}`;

const sectionClass = "bg-white rounded-2xl border border-[#E8E0D5] p-5 shadow-sm space-y-4";
const sectionTitleClass = "font-serif text-base text-[#3E2723] border-b border-[#E8E0D5] pb-2 mb-3";

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, name, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-[#3E2723]">{label}</label>
      <select name={name} value={value} onChange={onChange} className={selectClass}>
        <option value="">请选择</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
}

function TextField({ label, name, value, onChange, type = "text", placeholder, textarea }: TextFieldProps) {
  if (textarea) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm text-[#3E2723]">{label}</label>
        <Textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${inputClass} min-h-[80px]`}
        />
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-[#3E2723]">{label}</label>
      <Input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

// ============== 选项定义 ==============

const WORK_STATUS_OPTIONS = [
  { value: "久坐办公", label: "久坐办公" },
  { value: "经常外出", label: "经常外出" },
  { value: "体力劳动", label: "体力劳动" },
  { value: "自由职业", label: "自由职业" },
  { value: "全职主妇", label: "全职主妇" },
  { value: "已退休", label: "已退休" },
  { value: "其他", label: "其他" },
];

const EXERCISE_OPTIONS = [
  { value: "从不", label: "从不" },
  { value: "偶尔", label: "偶尔" },
  { value: "每周1-2次", label: "每周1-2次" },
  { value: "每周3-4次", label: "每周3-4次" },
  { value: "每天", label: "每天" },
];

const FREQ_NONE_TO_ALWAYS = [
  { value: "从不", label: "从不" },
  { value: "偶尔", label: "偶尔" },
  { value: "经常", label: "经常" },
  { value: "总是", label: "总是" },
];

const FREQ_NONE_TO_OFTEN = [
  { value: "从不", label: "从不" },
  { value: "偶尔", label: "偶尔" },
  { value: "经常", label: "经常" },
];

const PAIN_LEVEL = [
  { value: "无", label: "无" },
  { value: "轻微", label: "轻微" },
  { value: "中等", label: "中等" },
  { value: "严重", label: "严重" },
];

const EDEMA_LEVEL = [
  { value: "无", label: "无" },
  { value: "轻微", label: "轻微" },
  { value: "明显", label: "明显" },
];

const SEDENTARY_OPTIONS = [
  { value: "少于4小时", label: "少于4小时" },
  { value: "4-8小时", label: "4-8小时" },
  { value: "8-12小时", label: "8-12小时" },
  { value: "12小时以上", label: "12小时以上" },
];

const BEDTIME_OPTIONS = [
  { value: "22点前", label: "22点前" },
  { value: "22-23点", label: "22-23点" },
  { value: "23-24点", label: "23-24点" },
  { value: "24点后", label: "24点后" },
];

const TAKEOUT_OPTIONS = [
  { value: "从不", label: "从不" },
  { value: "偶尔", label: "偶尔" },
  { value: "经常", label: "经常" },
  { value: "每天", label: "每天" },
];

const DRINK_OPTIONS = [
  { value: "不喝", label: "不喝" },
  { value: "偶尔", label: "偶尔" },
  { value: "经常", label: "经常" },
];

const WATER_OPTIONS = [
  { value: "少于500ml", label: "少于500ml" },
  { value: "500-1000ml", label: "500-1000ml" },
  { value: "1000-1500ml", label: "1000-1500ml" },
  { value: "1500ml以上", label: "1500ml以上" },
];

const CRAVINGS_OPTIONS = [
  { value: "无", label: "无" },
  { value: "甜食", label: "甜食" },
  { value: "咸食", label: "咸食" },
  { value: "油炸", label: "油炸" },
  { value: "碳水", label: "碳水" },
];

const MENSTRUAL_OPTIONS = [
  { value: "规律", label: "规律" },
  { value: "不规律", label: "不规律" },
  { value: "已绝经", label: "已绝经" },
];

const COMMITMENT_OPTIONS = [
  { value: "很有信心", label: "很有信心" },
  { value: "一般", label: "一般" },
  { value: "不太确定", label: "不太确定" },
];

// ============== 页面组件 ==============

export default function NewQuestionnaire() {
  const router = useRouter();
  const params = useParams();
  const memberId = parseInt(params.id as string, 10);

  const [memberName, setMemberName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    age: "",
    height: "",
    weight: "",
    avgSleep: "",
    occupation: "",
    workStatus: "",
    exerciseFrequency: "",
    mainConcern: "",
    edema: "",
    fatigue: "",
    shoulderNeckPain: "",
    backPain: "",
    lowEnergy: "",
    constipation: "",
    sedentary: "",
    anxiety: "",
    bedtime: "",
    breakfast: "",
    lunch: "",
    dinner: "",
    takeout: "",
    sugaryDrinks: "",
    lateSnack: "",
    bingeTime: "",
    dietHistory: "",
    waterIntake: "",
    cravings: "",
    menstrualRegular: "",
    menstrualBinge: "",
    menstrualEdema: "",
    desiredState: "",
    commitment: "",
  });

  // 获取会员姓名并预填
  useEffect(() => {
    fetch(`/api/members`)
      .then((res) => res.json())
      .then((data: { id: number; name: string }[]) => {
        const member = data.find((m) => m.id === memberId);
        if (member) {
          setMemberName(member.name);
          setForm((prev) => ({ ...prev, name: member.name }));
        }
      })
      .catch(() => {});
  }, [memberId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

    const body: Record<string, unknown> = {
      memberId,
      name: form.name.trim(),
      age: form.age ? parseFloat(form.age) : null,
      height: form.height ? parseFloat(form.height) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      avgSleep: form.avgSleep ? parseFloat(form.avgSleep) : null,
      occupation: form.occupation || null,
      workStatus: form.workStatus || null,
      exerciseFrequency: form.exerciseFrequency || null,
      mainConcern: form.mainConcern || null,
      edema: form.edema || null,
      fatigue: form.fatigue || null,
      shoulderNeckPain: form.shoulderNeckPain || null,
      backPain: form.backPain || null,
      lowEnergy: form.lowEnergy || null,
      constipation: form.constipation || null,
      sedentary: form.sedentary || null,
      anxiety: form.anxiety || null,
      bedtime: form.bedtime || null,
      breakfast: form.breakfast || null,
      lunch: form.lunch || null,
      dinner: form.dinner || null,
      takeout: form.takeout || null,
      sugaryDrinks: form.sugaryDrinks || null,
      lateSnack: form.lateSnack || null,
      bingeTime: form.bingeTime || null,
      dietHistory: form.dietHistory || null,
      waterIntake: form.waterIntake || null,
      cravings: form.cravings || null,
      menstrualRegular: form.menstrualRegular || null,
      menstrualBinge: form.menstrualBinge || null,
      menstrualEdema: form.menstrualEdema || null,
      desiredState: form.desiredState || null,
      commitment: form.commitment || null,
    };

    const res = await fetch("/api/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push(`/members/${memberId}/questionnaire`);
    } else {
      setError("提交失败，请重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723] p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif tracking-wide mb-2">
          新增问卷 · {memberName || `会员 #${memberId}`}
        </h1>
        <p className="text-sm text-[#9E8E7E] mb-8">
          请根据会员填写的内容逐项录入，所有非必填项可留空
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ───────── 一、基本信息 ───────── */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>一、基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="姓名 *" name="name" value={form.name} onChange={handleChange} />
              <TextField label="职业" name="occupation" value={form.occupation} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <TextField label="年龄" name="age" type="number" value={form.age} onChange={handleChange} />
              <TextField label="身高 (cm)" name="height" type="number" value={form.height} onChange={handleChange} />
              <TextField label="体重 (kg)" name="weight" type="number" value={form.weight} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="工作状态" name="workStatus" value={form.workStatus} onChange={handleChange} options={WORK_STATUS_OPTIONS} />
              <SelectField label="运动频率" name="exerciseFrequency" value={form.exerciseFrequency} onChange={handleChange} options={EXERCISE_OPTIONS} />
            </div>
            <TextField label="主要困扰" name="mainConcern" value={form.mainConcern} onChange={handleChange} textarea placeholder="例如：产后恢复、腰痛、体态矫正等" />
          </div>

          {/* ───────── 二、身体状态 ───────── */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>二、身体状态</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="水肿情况" name="edema" value={form.edema} onChange={handleChange} options={EDEMA_LEVEL} />
              <SelectField label="疲劳感" name="fatigue" value={form.fatigue} onChange={handleChange} options={FREQ_NONE_TO_ALWAYS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="肩颈疼痛" name="shoulderNeckPain" value={form.shoulderNeckPain} onChange={handleChange} options={PAIN_LEVEL} />
              <SelectField label="腰痛" name="backPain" value={form.backPain} onChange={handleChange} options={PAIN_LEVEL} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="精力不足" name="lowEnergy" value={form.lowEnergy} onChange={handleChange} options={FREQ_NONE_TO_ALWAYS} />
              <SelectField label="便秘" name="constipation" value={form.constipation} onChange={handleChange} options={FREQ_NONE_TO_OFTEN} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="每日久坐时长" name="sedentary" value={form.sedentary} onChange={handleChange} options={SEDENTARY_OPTIONS} />
              <TextField label="日均睡眠 (小时)" name="avgSleep" type="number" value={form.avgSleep} onChange={handleChange} />
            </div>
          </div>

          {/* ───────── 三、心理 & 睡眠 ───────── */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>三、心理 & 睡眠</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="焦虑程度" name="anxiety" value={form.anxiety} onChange={handleChange} options={FREQ_NONE_TO_ALWAYS} />
              <SelectField label="就寝时间" name="bedtime" value={form.bedtime} onChange={handleChange} options={BEDTIME_OPTIONS} />
            </div>
          </div>

          {/* ───────── 四、饮食习惯 ───────── */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>四、饮食习惯</h2>
            <div className="grid grid-cols-3 gap-4">
              <TextField label="早餐" name="breakfast" value={form.breakfast} onChange={handleChange} placeholder="如：全麦面包+鸡蛋" />
              <TextField label="午餐" name="lunch" value={form.lunch} onChange={handleChange} placeholder="如：米饭+家常菜" />
              <TextField label="晚餐" name="dinner" value={form.dinner} onChange={handleChange} placeholder="如：沙拉+鸡胸肉" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="外卖频率" name="takeout" value={form.takeout} onChange={handleChange} options={TAKEOUT_OPTIONS} />
              <SelectField label="含糖饮料" name="sugaryDrinks" value={form.sugaryDrinks} onChange={handleChange} options={DRINK_OPTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="夜宵" name="lateSnack" value={form.lateSnack} onChange={handleChange} options={FREQ_NONE_TO_ALWAYS} />
              <TextField label="暴食时段" name="bingeTime" value={form.bingeTime} onChange={handleChange} placeholder="如：晚上10点后" />
            </div>
            <TextField label="节食/减肥史" name="dietHistory" value={form.dietHistory} onChange={handleChange} textarea placeholder="描述过往的节食或减肥经历" />
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="每日饮水量" name="waterIntake" value={form.waterIntake} onChange={handleChange} options={WATER_OPTIONS} />
              <SelectField label="食欲偏好" name="cravings" value={form.cravings} onChange={handleChange} options={CRAVINGS_OPTIONS} />
            </div>
          </div>

          {/* ───────── 五、经期情况 ───────── */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>五、经期情况</h2>
            <div className="grid grid-cols-3 gap-4">
              <SelectField label="月经规律" name="menstrualRegular" value={form.menstrualRegular} onChange={handleChange} options={MENSTRUAL_OPTIONS} />
              <SelectField label="经期暴食" name="menstrualBinge" value={form.menstrualBinge} onChange={handleChange} options={EDEMA_LEVEL} />
              <SelectField label="经期水肿" name="menstrualEdema" value={form.menstrualEdema} onChange={handleChange} options={EDEMA_LEVEL} />
            </div>
          </div>

          {/* ───────── 六、目标期望 ───────── */}
          <div className={sectionClass}>
            <h2 className={sectionTitleClass}>六、目标期望</h2>
            <TextField label="期望达到的状态" name="desiredState" value={form.desiredState} onChange={handleChange} textarea placeholder="例如：减重5kg、改善体态、缓解腰痛等" />
            <SelectField label="改变的决心" name="commitment" value={form.commitment} onChange={handleChange} options={COMMITMENT_OPTIONS} />
          </div>

          {/* 错误提示 */}
          {error && <p className="text-sm text-[#D4736A]">{error}</p>}

          {/* 按钮 */}
          <div className="flex gap-3 pt-2 pb-8">
            <Button type="submit" disabled={submitting}>
              {submitting ? "提交中..." : "提交问卷"}
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
