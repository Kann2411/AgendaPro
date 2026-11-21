import { PAYMENT_METHODS, STATUSES } from "./types";

export function money(cents: number, currency = "MXN", locale = "es-MX"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency}`;
  }
}

export function pesosToCents(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function statusLabel(id: string): string {
  return STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function methodLabel(id: string): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "primary";

export function statusTone(id: string): StatusTone {
  if (id === "completed") return "success";
  if (id === "pending" || id === "in_progress") return "warning";
  if (id === "confirmed") return "primary";
  if (id === "cancelled" || id === "no_show") return "danger";
  return "neutral";
}

export function contrastFg(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#f7f6f3";
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return "#f7f6f3";
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 160 ? "#1c1915" : "#f7f6f3";
}

export function errorText(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "No se pudo completar la acción";
}

/** "45 min", "1 h", "1 h 30 min". */
export function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
