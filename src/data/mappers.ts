import { bool, num, readDays, readMethods, str } from "@/domain/validation";
import type {
  Appointment,
  AppointmentStatus,
  Business,
  BusinessType,
  Client,
  Employee,
  Expense,
  Income,
  NotificationItem,
  PaymentMethod,
  Pet,
  Service,
} from "@/domain/types";

type BusinessRow = Record<string, unknown>;
type ServiceRow = Record<string, unknown>;
type EmployeeRow = Record<string, unknown>;
type ClientRow = Record<string, unknown>;
type PetRow = Record<string, unknown>;
type AppointmentRow = Record<string, unknown>;
type IncomeRow = Record<string, unknown>;
type ExpenseRow = Record<string, unknown>;
type NotificationRow = Record<string, unknown>;

export function mapBusiness(r: BusinessRow): Business {
  const theme = str(r.theme);
  const businessType = str(r.business_type);
  return {
    id: str(r.id),
    name: str(r.name),
    logoData: r.logo_data == null ? null : str(r.logo_data),
    colorPrimary: str(r.color_primary),
    colorSecondary: str(r.color_secondary),
    theme: theme === "dark" || theme === "system" ? theme : "light",
    businessType: (businessType || "other") as BusinessType,
    tracksPets: bool(r.tracks_pets),
    address: str(r.address),
    phone: str(r.phone),
    email: str(r.email),
    currency: str(r.currency) || "MXN",
    locale: str(r.locale) || "es-MX",
    openTime: str(r.open_time) || "09:00",
    closeTime: str(r.close_time) || "18:00",
    workDays: readDays(r.work_days),
    paymentMethods: readMethods(r.payment_methods),
    whatsappPhone: str(r.whatsapp_phone),
  };
}

export function mapService(r: ServiceRow): Service {
  return {
    id: str(r.id),
    name: str(r.name),
    description: str(r.description),
    category: str(r.category),
    priceCents: num(r.price_cents),
    durationMin: num(r.duration_min),
    active: bool(r.active),
  };
}

export function mapEmployee(r: EmployeeRow): Employee {
  return {
    id: str(r.id),
    name: str(r.name),
    photoData: r.photo_data == null ? null : str(r.photo_data),
    phone: str(r.phone),
    role: str(r.role),
    workStart: str(r.work_start),
    workEnd: str(r.work_end),
    workDays: readDays(r.work_days),
    serviceIds: str(r.service_ids).split(",").map((s) => s.trim()).filter(Boolean),
    active: bool(r.active),
  };
}

export function mapPet(r: PetRow): Pet {
  return {
    id: str(r.id),
    clientId: str(r.client_id),
    name: str(r.name),
    species: str(r.species),
    breed: str(r.breed),
    ageYears: r.age_years == null ? null : num(r.age_years),
    weightG: r.weight_g == null ? null : num(r.weight_g),
    healthNotes: str(r.health_notes),
    groomingPrefs: str(r.grooming_prefs),
  };
}

export function mapClient(r: ClientRow, pets: Pet[] = []): Client {
  return {
    id: str(r.id),
    fullName: str(r.full_name),
    phone: str(r.phone),
    email: str(r.email),
    address: str(r.address),
    notes: str(r.notes),
    createdAt: str(r.created_at),
    pets,
  };
}

export function mapAppointment(r: AppointmentRow): Appointment {
  const status = str(r.status);
  return {
    id: str(r.id),
    clientId: r.client_id == null ? null : str(r.client_id),
    clientName: str(r.client_name),
    clientPhone: str(r.client_phone),
    petName: str(r.pet_name),
    serviceId: r.service_id == null ? null : str(r.service_id),
    serviceName: str(r.service_name),
    employeeId: r.employee_id == null ? null : str(r.employee_id),
    employeeName: str(r.employee_name),
    localDate: str(r.local_date).slice(0, 10),
    localTime: str(r.local_time),
    durationMin: num(r.duration_min),
    priceCents: num(r.price_cents),
    notes: str(r.notes),
    status: (status || "pending") as AppointmentStatus,
    paymentMethod: r.payment_method == null ? null : str(r.payment_method),
  };
}

export function mapIncome(r: IncomeRow): Income {
  return {
    id: str(r.id),
    appointmentId: r.appointment_id == null ? null : str(r.appointment_id),
    amountCents: num(r.amount_cents),
    method: str(r.method),
    serviceName: str(r.service_name),
    employeeId: r.employee_id == null ? null : str(r.employee_id),
    employeeName: str(r.employee_name),
    note: str(r.note),
    occurredOn: str(r.occurred_on).slice(0, 10),
  };
}

export function mapExpense(r: ExpenseRow): Expense {
  return {
    id: str(r.id),
    category: str(r.category),
    description: str(r.description),
    amountCents: num(r.amount_cents),
    occurredOn: str(r.occurred_on).slice(0, 10),
  };
}

export function mapNotification(r: NotificationRow): NotificationItem {
  return {
    id: str(r.id),
    kind: str(r.kind),
    title: str(r.title),
    body: str(r.body),
    isRead: bool(r.is_read),
    createdAt: str(r.created_at),
  };
}

export function toPaymentMethod(value: unknown): PaymentMethod | null {
  const v = str(value);
  return v ? (v as PaymentMethod) : null;
}
