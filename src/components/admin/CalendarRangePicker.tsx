"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface CalendarRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function CalendarRangePicker({
  startDate,
  endDate,
  onChange,
}: CalendarRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 当前正在挑选：'start' 挑选开始日期，'end' 挑选截止日期
  const [activeTarget, setActiveTarget] = useState<"start" | "end">("start");

  // 日历当前浏览的年月
  const [viewYear, setViewYear] = useState(() => {
    return startDate ? Number(startDate.slice(0, 4)) : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    return startDate ? Number(startDate.slice(5, 7)) - 1 : new Date().getMonth();
  });

  // 点击外部自动收起
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 年月切换
  const changeMonth = (delta: number) => {
    const dt = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(dt.getUTCFullYear());
    setViewMonth(dt.getUTCMonth());
  };

  // 快捷预设
  const setPreset = (type: "thisMonth" | "prevMonth" | "thisWeek" | "recent30") => {
    const now = new Date();
    if (type === "thisMonth") {
      const y = now.getFullYear();
      const m = now.getMonth();
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setViewYear(y);
      setViewMonth(m);
      onChange(start, end);
    } else if (type === "prevMonth") {
      const prev = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
      const y = prev.getUTCFullYear();
      const m = prev.getUTCMonth();
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setViewYear(y);
      setViewMonth(m);
      onChange(start, end);
    } else if (type === "thisWeek") {
      const day = now.getDay() || 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day - 1));
      const sun = new Date(now);
      sun.setDate(now.getDate() + (7 - day));
      onChange(formatDateStr(mon), formatDateStr(sun));
    } else if (type === "recent30") {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      onChange(formatDateStr(start), formatDateStr(end));
    }
    setIsOpen(false);
  };

  // 生成日历网格
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  // 星期几（0:周日, 1:周一...）转换为 0:周一, 6:周日
  const firstDayWeekday = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7;

  // 点击日期格子
  const handleSelectDay = (dayNum: number) => {
    const selected = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

    if (activeTarget === "start") {
      if (selected > endDate) {
        onChange(selected, selected);
      } else {
        onChange(selected, endDate);
      }
      setActiveTarget("end"); // 选完开始，自动提示选截止
    } else {
      if (selected < startDate) {
        onChange(selected, selected);
      } else {
        onChange(startDate, selected);
      }
      setIsOpen(false); // 选完截止直接完成
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* 触发卡片按钮：直观展示起止日期 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-[#F9FAFB] border border-[#2563EB]/30 hover:border-[#2563EB] rounded-lg px-3 py-1.5 shadow-2xs transition-all text-xs text-[#292D35] cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-[#2563EB]" />
        <span className="font-semibold tabular-nums">{startDate || "开始日期"}</span>
        <span className="text-[#9CA3AF]">至</span>
        <span className="font-semibold tabular-nums">{endDate || "截止日期"}</span>
        <span className="text-[10px] text-[#2563EB] bg-[#E8EEFF] px-1.5 py-0.5 rounded font-medium ml-1">
          点击展开日历
        </span>
      </button>

      {/* 下拉日历面板 */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-[#E1E5EB] rounded-xl shadow-xl p-4 w-[340px] text-xs">
          {/* 快捷选择标签栏 */}
          <div className="flex items-center justify-between gap-1 pb-3 mb-3 border-b border-[#E1E5EB]">
            <span className="text-[11px] font-medium text-[#697180]">快捷周期：</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreset("thisMonth")}
                className="px-2 py-0.5 bg-[#F5F7FA] hover:bg-[#E8EEFF] hover:text-[#2563EB] rounded text-[11px] text-[#4B5563] transition-colors"
              >
                本月
              </button>
              <button
                type="button"
                onClick={() => setPreset("prevMonth")}
                className="px-2 py-0.5 bg-[#F5F7FA] hover:bg-[#E8EEFF] hover:text-[#2563EB] rounded text-[11px] text-[#4B5563] transition-colors"
              >
                上月
              </button>
              <button
                type="button"
                onClick={() => setPreset("thisWeek")}
                className="px-2 py-0.5 bg-[#F5F7FA] hover:bg-[#E8EEFF] hover:text-[#2563EB] rounded text-[11px] text-[#4B5563] transition-colors"
              >
                本周
              </button>
              <button
                type="button"
                onClick={() => setPreset("recent30")}
                className="px-2 py-0.5 bg-[#F5F7FA] hover:bg-[#E8EEFF] hover:text-[#2563EB] rounded text-[11px] text-[#4B5563] transition-colors"
              >
                近30天
              </button>
            </div>
          </div>

          {/* 开始 / 截止 状态指示器 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setActiveTarget("start")}
              className={`p-2 rounded-lg border text-left transition-all ${
                activeTarget === "start"
                  ? "border-[#2563EB] bg-[#E8EEFF]/50 text-[#2563EB] ring-1 ring-[#2563EB]"
                  : "border-[#E1E5EB] bg-white text-[#4B5563]"
              }`}
            >
              <div className="text-[10px] text-[#697180]">
                {activeTarget === "start" ? "正在选择开始日期" : "开始日期"}
              </div>
              <div className="font-bold text-xs tabular-nums mt-0.5">{startDate}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTarget("end")}
              className={`p-2 rounded-lg border text-left transition-all ${
                activeTarget === "end"
                  ? "border-[#2563EB] bg-[#E8EEFF]/50 text-[#2563EB] ring-1 ring-[#2563EB]"
                  : "border-[#E1E5EB] bg-white text-[#4B5563]"
              }`}
            >
              <div className="text-[10px] text-[#697180]">
                {activeTarget === "end" ? "正在选择截止日期" : "截止日期"}
              </div>
              <div className="font-bold text-xs tabular-nums mt-0.5">{endDate}</div>
            </button>
          </div>

          {/* 年月导航区 */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-[#F5F7FA] rounded-md text-[#697180] hover:text-[#292D35]"
              title="上一月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-[#292D35] tabular-nums">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-[#F5F7FA] rounded-md text-[#697180] hover:text-[#292D35]"
              title="下一月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 gap-1 text-center font-medium text-[#697180] text-[11px] mb-1">
            <span>一</span>
            <span>二</span>
            <span>三</span>
            <span>四</span>
            <span>五</span>
            <span>六</span>
            <span>日</span>
          </div>

          {/* 日历格子 */}
          <div className="grid grid-cols-7 gap-1">
            {/* 补齐月初空白 */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* 当月日期 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isStart = dateStr === startDate;
              const isEnd = dateStr === endDate;
              const inRange = dateStr > startDate && dateStr < endDate;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 rounded-md text-xs font-medium tabular-nums flex items-center justify-center transition-colors cursor-pointer ${
                    isStart || isEnd
                      ? "bg-[#2563EB] text-white font-bold shadow-xs"
                      : inRange
                      ? "bg-[#E8EEFF] text-[#2563EB]"
                      : "hover:bg-[#F3F4F6] text-[#292D35]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 底部确认栏 */}
          <div className="mt-3 pt-2.5 border-t border-[#E1E5EB] flex items-center justify-between">
            <span className="text-[11px] text-[#697180]">
              点击日历天数直接完成选择
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-medium"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
