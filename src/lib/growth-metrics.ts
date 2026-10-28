import { addCalendarDays, shanghaiToday } from "@/lib/shanghai-date";

export type MeasurementDraft = {
  measuredOn: string;
  weightKg: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bustCm: number | null;
  thighCm: number | null;
  note: string;
};

function num(value: unknown, min: number, max: number, label: string): { value: number | null; error?: string } {
  if (value === undefined || value === null || value === "") return { value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return { value: null, error: `${label}需在 ${min}–${max} 之间` };
  return { value: Math.round(n * 10) / 10 };
}

export function validateMeasurement(input: Record<string, unknown>, now: Date = new Date()): { ok: true; value: MeasurementDraft } | { ok: false; error: string } {
  const today = shanghaiToday(now);
  const measuredOn = String(input.measuredOn || input.measured_on || today).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredOn)) return { ok: false, error: "测量日期格式应为 YYYY-MM-DD" };
  if (measuredOn > today) return { ok: false, error: "测量日期不能晚于今天" };
  const weight = num(input.weightKg ?? input.weight_kg, 30, 200, "体重");
  const waist = num(input.waistCm ?? input.waist_cm, 40, 200, "腰围");
  const hip = num(input.hipCm ?? input.hip_cm, 40, 200, "臀围");
  const bust = num(input.bustCm ?? input.bust_cm, 40, 200, "胸围");
  const thigh = num(input.thighCm ?? input.thigh_cm, 20, 120, "大腿围");
  const bad = [weight, waist, hip, bust, thigh].find((x) => x.error);
  if (bad?.error) return { ok: false, error: bad.error };
  if ([weight, waist, hip, bust, thigh].every((x) => x.value == null)) return { ok: false, error: "至少填写一项体围或体重" };
  return {
    ok: true,
    value: {
      measuredOn,
      weightKg: weight.value,
      waistCm: waist.value,
      hipCm: hip.value,
      bustCm: bust.value,
      thighCm: thigh.value,
      note: String(input.note || "").trim().slice(0, 200),
    },
  };
}

function weekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const weekday = utc.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  return utc.toISOString().slice(0, 10);
}

/** Consecutive weeks with at least one attendance, ending this week or last week. */
export function attendanceStreakWeeks(dates: string[], today: string): number {
  const weeks = new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).map(weekStart));
  if (!weeks.size) return 0;
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor = addCalendarDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -7);
  }
  return streak;
}
