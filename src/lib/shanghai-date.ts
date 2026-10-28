/** Calendar dates for 徕舞. Business day is Asia/Shanghai, not UTC. */

const SHANGHAI = "Asia/Shanghai";

export function shanghaiToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) throw new Error("无法计算上海日期");
  return `${y}-${m}-${d}`;
}

export function addCalendarDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) throw new Error("日期格式错误");
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Inclusive companionship days: the join date itself counts as day 1. */
export function companionshipDays(joinedAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!joinedAt) return null;
  const start = String(joinedAt).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const today = shanghaiToday(now);
  const [ys, ms, ds] = start.split("-").map(Number);
  const [yt, mt, dt] = today.split("-").map(Number);
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(yt, mt - 1, dt);
  const diff = Math.round((b - a) / 86400000);
  if (!Number.isFinite(diff)) return null;
  return Math.max(1, diff + 1);
}

/** Timestamp stored as UTC wall-clock → Shanghai calendar date. */
export function shanghaiDateOfTimestamp(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return shanghaiToday(d);
}
