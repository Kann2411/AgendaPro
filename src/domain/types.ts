/**
 * Dominio de AgendaPro.
 * Estos tipos son la frontera entre la UI, la base de datos local y el futuro
 * adaptador de nube. Se mantienen deliberadamente independientes de React y
 * de expo-sqlite para que puedan reutilizarse en un backend más adelante.
 */

export const STATUSES = [
  { id: "pending", label: "Pendiente" },
  { id: "confirmed", label: "Confirmada" },
  { id: "in_progress", label: "En proceso" },
  { id: "completed", label: "Completada" },
  { id: "cancelled", label: "Cancelada" },
  { id: "no_show", label: "No asistió" },
] as const;

export type AppointmentStatus = (typeof STATUSES)[number]["id"];

export const ACTIVE_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "in_progress"];

export const BUSINESS_TYPES = [
  { id: "groomer", label: "Peluquería canina", pets: true },
  { id: "pet_shop", label: "Tienda de mascotas", pets: true },
  { id: "salon", label: "Peluquería", pets: false },
  { id: "barber", label: "Barbería", pets: false },
  { id: "aesthetic", label: "Centro de estética", pets: false },
  { id: "other", label: "Negocio por citas", pets: false },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "cash", label: "Efectivo" },
  { id: "transfer", label: "Transferencia" },
  { id: "card", label: "Tarjeta" },
  { id: "other", label: "Otros" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

export const CURRENCIES = ["MXN", "COP", "USD", "EUR", "ARS", "CLP", "PEN", "GTQ"] as const;
export const LOCALES = [
  { id: "es-MX", label: "Español (México)" },
  { id: "es-CO", label: "Español (Colombia)" },
  { id: "es-AR", label: "Español (Argentina)" },
  { id: "es-ES", label: "Español (España)" },
  { id: "en-US", label: "English (US)" },
] as const;

export const WEEKDAYS = [
  { id: 0, short: "D", label: "Dom" },
  { id: 1, short: "L", label: "Lun" },
  { id: 2, short: "M", label: "Mar" },
  { id: 3, short: "M", label: "Mié" },
  { id: 4, short: "J", label: "Jue" },
  { id: 5, short: "V", label: "Vie" },
  { id: 6, short: "S", label: "Sáb" },
] as const;

export const EXPENSE_CATEGORIES = [
  "Renta",
  "Insumos",
  "Nómina",
  "Servicios públicos",
  "Marketing",
  "Mantenimiento",
  "Otros",
] as const;

export const PALETTES = [
  { name: "Abeto", primary: "#1f4d40", secondary: "#8d6a3f" },
  { name: "Tinta", primary: "#1e3a4c", secondary: "#7d8b99" },
  { name: "Terracota", primary: "#8c4634", secondary: "#c4a27a" },
  { name: "Pizarra", primary: "#3d4550", secondary: "#9aa3ad" },
  { name: "Oliva", primary: "#3f4f2f", secondary: "#8a8f55" },
  { name: "Marino", primary: "#1d3f66", secondary: "#c47b5a" },
] as const;

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type Business = {
  id: string;
  name: string;
  logoData: string | null;
  colorPrimary: string;
  colorSecondary: string;
  theme: "light" | "dark" | "system";
  businessType: BusinessType;
  tracksPets: boolean;
  address: string;
  phone: string;
  email: string;
  currency: string;
  locale: string;
  openTime: string;
  closeTime: string;
  workDays: number[];
  paymentMethods: PaymentMethod[];
  whatsappPhone: string;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  durationMin: number;
  active: boolean;
};

export type Employee = {
  id: string;
  name: string;
  photoData: string | null;
  phone: string;
  role: string;
  workStart: string;
  workEnd: string;
  workDays: number[];
  serviceIds: string[];
  active: boolean;
};

export type Pet = {
  id: string;
  clientId: string;
  name: string;
  species: string;
  breed: string;
  ageYears: number | null;
  weightG: number | null;
  healthNotes: string;
  groomingPrefs: string;
};

export type Client = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  pets: Pet[];
};

export type Appointment = {
  id: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  petName: string;
  serviceId: string | null;
  serviceName: string;
  employeeId: string | null;
  employeeName: string;
  localDate: string;
  localTime: string;
  durationMin: number;
  priceCents: number;
  notes: string;
  status: AppointmentStatus;
  paymentMethod: string | null;
};

export type Income = {
  id: string;
  appointmentId: string | null;
  amountCents: number;
  method: string;
  serviceName: string;
  employeeId: string | null;
  employeeName: string;
  note: string;
  occurredOn: string;
};

export type Expense = {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  occurredOn: string;
};

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type DashboardData = {
  day: string;
  scheduled: number;
  completed: number;
  pending: number;
  cancelled: number;
  noShow: number;
  clientsSeen: number;
  dayRevenue: number;
  monthRevenue: number;
  monthExpense: number;
  completionRate: number;
  upcoming: Appointment[];
  todayList: Appointment[];
  series: { day: string; revenue: number; count: number }[];
  topService: { name: string; count: number } | null;
  teamToday: { name: string; count: number }[];
};

export type FinanceReport = {
  from: string;
  to: string;
  grossCents: number;
  expenseCents: number;
  netCents: number;
  incomes: Income[];
  expenses: Expense[];
  byService: { name: string; count: number; cents: number }[];
  byEmployee: { name: string; count: number; cents: number }[];
  byMethod: { method: string; cents: number }[];
  topDays: { day: string; cents: number }[];
  series: { day: string; income: number; expense: number }[];
  months: { month: string; income: number; expense: number }[];
  newClients: number;
  returningClients: number;
  incomesTruncated?: boolean;
};

export type ClientProfile = {
  client: Client;
  appointments: Appointment[];
  totalSpent: number;
  visits: number;
};

/** Entrada de la cola de sincronización (fase 2: nube). */
export type OutboxEvent = {
  id: string;
  entity: string;
  entityId: string;
  op: "insert" | "update" | "delete";
  payload: string;
  createdAt: string;
  syncedAt: string | null;
  attempts: number;
};
