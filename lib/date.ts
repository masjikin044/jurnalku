export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Jakarta";

const LOCALE = "id-ID";

/** 'YYYY-MM-DD' untuk sebuah instant, dihitung di zona waktu aplikasi. */
export function dateKey(d: Date, tz: string = APP_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUTC = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return asUTC - Math.floor(utcMs / 1000) * 1000;
}

/** Instant (UTC) untuk awal hari 'YYYY-MM-DD' di zona waktu aplikasi. */
export function startOfDay(key: string, tz: string = APP_TZ): Date {
  const [y, m, d] = key.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - tzOffsetMs(guess, tz));
}

function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isDateKey(v?: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

export function isMonthKey(v?: string | null): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function dayRange(key: string) {
  return { start: startOfDay(key), end: startOfDay(addDaysKey(key, 1)) };
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(monthKey: string) {
  return {
    start: startOfDay(`${monthKey}-01`),
    end: startOfDay(`${shiftMonth(monthKey, 1)}-01`),
  };
}

export function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: APP_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  }).format(d);
}

export function formatDateTime(d: Date) {
  return formatDate(d, { hour: "2-digit", minute: "2-digit" });
}

export function formatMonthTitle(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
