import { format } from "date-fns";
import { es } from "date-fns/locale";

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(iso: string, pattern = "EEE d MMM"): string {
  return format(parseDay(iso), pattern, { locale: es });
}

export function formatLongDay(iso: string): string {
  const raw = format(parseDay(iso), "EEEE d 'de' MMMM", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatTime(hhmm: string): string {
  const [hs, ms] = hhmm.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const am = h < 12;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${am ? "a. m." : "p. m."}`;
}

export function isoToday(d = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function timeNow(d = new Date()): string {
  return format(d, "HH:mm");
}

export function weekdayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function monthEnd(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m ?? 1, 0)).toISOString().slice(0, 10);
}

export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1 + n, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d ?? 1, last);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), day)).toISOString().slice(0, 10);
}

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function addMinutes(hhmm: string, mins: number): { hhmm: string; overflow: boolean } {
  const total = minutes(hhmm) + mins;
  const overflow = total >= 24 * 60 || total < 0;
  const clamped = Math.max(0, Math.min(total, 24 * 60 - 1));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return { hhmm: `${hh}:${mm}`, overflow };
}

/**
 * Convierte fecha/hora local a ISO UTC.
 * `tzOffsetMinutes` es el desfase local respecto a UTC (UTC-6 => -360),
 * así que UTC = hora local - desfase.
 */
export function toUtcIso(day: string, time: string, tzOffsetMinutes: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const utc = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - tzOffsetMinutes * 60_000;
  return new Date(utc).toISOString();
}

export function weekDays(anchor: string): string[] {
  const base = parseDay(anchor);
  const offset = (base.getDay() + 6) % 7;
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) =>
    format(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i), "yyyy-MM-dd"),
  );
}

export function monthGrid(anchorDay: string): string[] {
  const [y, m] = anchorDay.split("-").map(Number);
  const first = new Date(y, (m ?? 1) - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(y, (m ?? 1) - 1, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) =>
    format(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), "yyyy-MM-dd"),
  );
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return days;
}

/**
 * Desfase de la zona horaria del dispositivo respecto a UTC, en minutos
 * (UTC-6 => -360). Si se indica fecha/hora, usa el desfase vigente en ese
 * momento para respetar cambios de horario de verano.
 */
export function deviceTzOffsetMinutes(day?: string, time?: string): number {
  if (!day) return -new Date().getTimezoneOffset();
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return -new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).getTimezoneOffset();
}
