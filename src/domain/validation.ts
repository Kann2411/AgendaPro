import { addMinutes, minutes, weekdayIndex } from "./time";
import { METHOD_IDS, STATUS_IDS, TYPES } from "./constants";
import {
  PAYMENT_METHODS,
  type AppointmentStatus,
  type Business,
  type Employee,
  type PaymentMethod,
} from "./types";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
export function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "t" || v === "true";
}
export function clip(value: unknown, max: number): string {
  return str(value).trim().slice(0, max);
}

export function reqDay(value: unknown, label: string): string {
  const v = clip(value, 10);
  if (!DAY_RE.test(v)) throw new Error(`${label} no es una fecha válida`);
  return v;
}
export function reqTime(value: unknown, label: string): string {
  const v = clip(value, 5);
  if (!TIME_RE.test(v)) throw new Error(`${label} no es una hora válida`);
  return v;
}
export function reqHex(value: unknown, label: string): string {
  const v = clip(value, 7);
  if (!HEX_RE.test(v)) throw new Error(`${label} no es válido`);
  return v;
}

export function parseDays(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : clip(value, 40).split(",");
  const days = [...new Set(raw.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))].sort(
    (a, b) => a - b,
  );
  if (!days.length) throw new Error("Elige al menos un día laboral");
  return days;
}
export function daysToStr(days: number[]): string {
  return days.join(",");
}
export function readDays(value: unknown): number[] {
  return str(value)
    .split(",")
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
}

export function parseMethods(value: unknown): PaymentMethod[] {
  const raw = Array.isArray(value) ? value.map(String) : clip(value, 80).split(",");
  const methods = PAYMENT_METHODS.map((m) => m.id).filter((id) => raw.includes(id));
  if (!methods.length) throw new Error("Activa al menos un método de pago");
  return methods;
}
export function readMethods(value: unknown): PaymentMethod[] {
  const raw = str(value).split(",");
  const methods = PAYMENT_METHODS.map((m) => m.id).filter((id) => raw.includes(id));
  return methods.length ? methods : ["cash"];
}

export function imageOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const v = str(value);
  if (!v.startsWith("data:image/")) throw new Error("La imagen no es válida");
  if (v.length > 400_000) throw new Error("La imagen es demasiado pesada");
  return v;
}

export type SaveAppointmentInput = {
  id?: string;
  clientId?: string | null;
  clientName: string;
  clientPhone?: string;
  petName?: string;
  serviceId?: string | null;
  serviceName: string;
  employeeId?: string | null;
  localDate: string;
  localTime: string;
  durationMin: number;
  priceCents: number;
  notes?: string;
  status: string;
  paymentMethod?: string | null;
  overrideHours?: boolean;
  tzOffsetMinutes: number;
};

export function readAppointmentInput(input: SaveAppointmentInput): SaveAppointmentInput {
  const status = clip(input.status, 20);
  if (!STATUS_IDS.has(status)) throw new Error("Estado de cita no válido");
  const durationMin = Math.round(Number(input.durationMin));
  const priceCents = Math.round(Number(input.priceCents));
  if (!Number.isFinite(durationMin) || durationMin < 5 || durationMin > 600) {
    throw new Error("La duración debe estar entre 5 y 600 minutos");
  }
  if (!Number.isFinite(priceCents) || priceCents < 0 || priceCents > 100_000_000) {
    throw new Error("El precio no es válido");
  }
  const clientName = clip(input.clientName, 120);
  const serviceName = clip(input.serviceName, 120);
  if (!clientName) throw new Error("Escribe el nombre del cliente");
  if (!serviceName) throw new Error("Indica el servicio");
  const payment = input.paymentMethod ? clip(input.paymentMethod, 20) : null;
  if (payment && !METHOD_IDS.has(payment)) throw new Error("Método de pago no válido");
  if (status === "completed" && !payment) {
    throw new Error("Indica el método de pago para completar la cita");
  }
  const tz = Math.round(Number(input.tzOffsetMinutes));
  if (!Number.isFinite(tz) || tz < -14 * 60 || tz > 14 * 60) throw new Error("Zona horaria no válida");
  return {
    ...input,
    clientName,
    serviceName,
    clientPhone: clip(input.clientPhone, 40),
    petName: clip(input.petName, 80),
    notes: clip(input.notes, 2000),
    localDate: reqDay(input.localDate, "La fecha"),
    localTime: reqTime(input.localTime, "La hora"),
    durationMin,
    priceCents,
    status,
    paymentMethod: payment,
    tzOffsetMinutes: tz,
    overrideHours: Boolean(input.overrideHours),
    clientId: input.clientId ? clip(input.clientId, 80) : null,
    serviceId: input.serviceId ? clip(input.serviceId, 80) : null,
    employeeId: input.employeeId ? clip(input.employeeId, 80) : null,
    id: input.id ? clip(input.id, 80) : undefined,
  };
}

export function validateBusinessInput(data: {
  name: string;
  colorPrimary: string;
  colorSecondary: string;
  businessType: string;
  openTime: string;
  closeTime: string;
  workDays: number[];
  paymentMethods: string[];
  currency: string;
  email?: string;
  logoData?: string | null;
}): void {
  if (clip(data.name, 80).length < 2) throw new Error("Escribe el nombre del negocio");
  reqHex(data.colorPrimary, "El color principal");
  reqHex(data.colorSecondary, "El color secundario");
  if (!TYPES.has(data.businessType)) throw new Error("Tipo de negocio no válido");
  const openTime = reqTime(data.openTime, "La apertura");
  const closeTime = reqTime(data.closeTime, "El cierre");
  if (minutes(openTime) >= minutes(closeTime)) throw new Error("El cierre debe ser después de la apertura");
  parseDays(data.workDays);
  parseMethods(data.paymentMethods);
  if (!/^[A-Z]{3}$/.test(clip(data.currency, 8).toUpperCase())) throw new Error("Moneda no válida");
  const email = clip(data.email, 160);
  if (email && !email.includes("@")) throw new Error("El correo no es válido");
  if (data.logoData !== undefined) imageOrNull(data.logoData);
}

export function validateSlot(args: {
  input: SaveAppointmentInput;
  business: Pick<Business, "workDays" | "openTime" | "closeTime">;
  employee: Pick<Employee, "workDays" | "workStart" | "workEnd"> | null;
  hasConflict: boolean;
}): void {
  const { input, business, employee, hasConflict } = args;
  if (input.employeeId && hasConflict) {
    throw new Error("Ese empleado ya tiene una cita en ese horario");
  }
  if (input.overrideHours) return;
  const day = weekdayIndex(input.localDate);
  if (!business.workDays.includes(day)) {
    throw new Error("El negocio no atiende ese día. Marca la excepción de horario si quieres agendar igual.");
  }
  const startMin = minutes(input.localTime);
  const end = addMinutes(input.localTime, input.durationMin);
  if (end.overflow || startMin < minutes(business.openTime) || minutes(end.hhmm) > minutes(business.closeTime)) {
    throw new Error("La cita queda fuera del horario del negocio. Marca la excepción si quieres continuar.");
  }
  if (employee) {
    if (!employee.workDays.includes(day)) {
      throw new Error("Ese empleado no trabaja ese día. Marca la excepción de horario si quieres asignarlo.");
    }
    if (
      startMin < minutes(employee.workStart) ||
      minutes(end.hhmm) > minutes(employee.workEnd) ||
      end.overflow
    ) {
      throw new Error("La cita queda fuera del horario del empleado. Marca la excepción si quieres continuar.");
    }
  }
}

export function assertPaymentAllowed(business: Business, method: string | null): void {
  if (method && !business.paymentMethods.includes(method as PaymentMethod)) {
    throw new Error("Ese método de pago no está activo");
  }
}

export const STATUS_VALUES = [...STATUS_IDS] as AppointmentStatus[];
