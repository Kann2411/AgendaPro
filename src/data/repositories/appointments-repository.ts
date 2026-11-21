import { getDb } from "../db/database";
import { enqueueOutbox } from "../db/outbox";
import { mapAppointment } from "../mappers";
import { METHOD_IDS, STATUS_IDS } from "@/domain/constants";
import { toUtcIso } from "@/domain/time";
import type { Appointment, AppointmentStatus } from "@/domain/types";
import {
  assertPaymentAllowed,
  clip,
  readAppointmentInput,
  validateSlot,
  type SaveAppointmentInput,
} from "@/domain/validation";
import { newId } from "@/utils/id";
import { getBusiness } from "./business-repository";
import { getEmployeeForBooking } from "./catalog-repository";
import { clearIncomeForAppointment, recordIncomeForAppointment } from "./finance-repository";
import { pushNotice } from "./notifications-repository";

export async function listAppointments(from: string, to: string): Promise<Appointment[]> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM appointments
    WHERE deleted_at IS NULL AND local_date >= ${from} AND local_date <= ${to}
    ORDER BY local_date, local_time
    LIMIT 20000
  `;
  return rows.map(mapAppointment);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM appointments WHERE id = ${id} AND deleted_at IS NULL`;
  return rows[0] ? mapAppointment(rows[0]) : null;
}

export async function saveAppointment(input: SaveAppointmentInput): Promise<Appointment> {
  const data = readAppointmentInput(input);
  const db = await getDb();
  const business = await getBusiness();
  if (!business) throw new Error("Primero configura tu negocio");
  assertPaymentAllowed(business, data.paymentMethod ?? null);

  let clientName = data.clientName;
  let clientPhone = data.clientPhone ?? "";
  if (data.clientId) {
    const rows = await db.sql<{ full_name: string; phone: string }>`
      SELECT full_name, phone FROM clients WHERE id = ${data.clientId} AND deleted_at IS NULL
    `;
    if (!rows[0]) throw new Error("Cliente no encontrado");
    clientName = rows[0].full_name;
    if (!clientPhone) clientPhone = rows[0].phone;
  }

  let serviceName = data.serviceName;
  if (data.serviceId) {
    const rows = await db.sql<{ name: string }>`
      SELECT name FROM services WHERE id = ${data.serviceId} AND deleted_at IS NULL
    `;
    if (!rows[0]) throw new Error("Servicio no encontrado");
    serviceName = rows[0].name;
  }

  const employee = data.employeeId ? await getEmployeeForBooking(data.employeeId) : null;
  if (data.employeeId && !employee) throw new Error("Ese empleado no está disponible");
  const employeeName = employee?.name ?? "";

  const startsAt = toUtcIso(data.localDate, data.localTime, data.tzOffsetMinutes);
  const endsAt = new Date(
    new Date(startsAt).getTime() + data.durationMin * 60_000,
  ).toISOString();

  let hasConflict = false;
  if (data.employeeId) {
    const clash = await db.sql<{ id: string }>`
      SELECT id FROM appointments
      WHERE deleted_at IS NULL AND employee_id = ${data.employeeId}
        AND id <> ${data.id ?? ""}
        AND status NOT IN ('cancelled', 'no_show')
        AND starts_at < ${endsAt} AND ends_at > ${startsAt}
      LIMIT 1
    `;
    hasConflict = !!clash[0];
  }

  validateSlot({
    input: data,
    business: {
      workDays: business.workDays,
      openTime: business.openTime,
      closeTime: business.closeTime,
    },
    employee: employee
      ? { workDays: employee.workDays, workStart: employee.workStart, workEnd: employee.workEnd }
      : null,
    hasConflict,
  });

  const id = data.id ?? newId("a_");
  const now = new Date().toISOString();
  let previous: Appointment | null = null;
  if (data.id) previous = await getAppointment(data.id);
  if (data.id && !previous) throw new Error("Cita no encontrada");

  await db.withTransactionAsync(async () => {
    await db.sql`
      INSERT INTO appointments (
        id, client_id, client_name, client_phone, pet_name, service_id, service_name,
        employee_id, employee_name, local_date, local_time, starts_at, ends_at, duration_min,
        price_cents, notes, status, payment_method, updated_at
      ) VALUES (
        ${id}, ${data.clientId}, ${clientName}, ${clientPhone}, ${data.petName ?? ""},
        ${data.serviceId}, ${serviceName}, ${data.employeeId}, ${employeeName},
        ${data.localDate}, ${data.localTime}, ${startsAt}, ${endsAt}, ${data.durationMin},
        ${data.priceCents}, ${data.notes ?? ""}, ${data.status}, ${data.paymentMethod}, ${now}
      )
      ON CONFLICT(id) DO UPDATE SET
        client_id = excluded.client_id, client_name = excluded.client_name,
        client_phone = excluded.client_phone, pet_name = excluded.pet_name,
        service_id = excluded.service_id, service_name = excluded.service_name,
        employee_id = excluded.employee_id, employee_name = excluded.employee_name,
        local_date = excluded.local_date, local_time = excluded.local_time,
        starts_at = excluded.starts_at, ends_at = excluded.ends_at,
        duration_min = excluded.duration_min, price_cents = excluded.price_cents,
        notes = excluded.notes, status = excluded.status,
        payment_method = excluded.payment_method, updated_at = excluded.updated_at,
        deleted_at = NULL
    `;
    await enqueueOutbox(db, "appointment", id, previous ? "update" : "insert", { clientName, serviceName });

    if (data.status === "completed" && data.paymentMethod) {
      await recordIncomeForAppointment(db, {
        id,
        priceCents: data.priceCents,
        method: data.paymentMethod,
        serviceName,
        employeeId: data.employeeId ?? null,
        employeeName,
        localDate: data.localDate,
      });
    } else {
      await clearIncomeForAppointment(db, id);
    }

    if (!previous) {
      await pushNotice(
        db,
        "new",
        "Nueva cita",
        `${clientName} · ${serviceName} el ${data.localDate} a las ${data.localTime}.`,
        `new:${id}`,
        business.whatsappPhone,
      );
    } else {
      const moved =
        previous.localDate !== data.localDate || previous.localTime !== data.localTime;
      if (moved) {
        await pushNotice(
          db,
          "reschedule",
          "Cambio de horario",
          `${clientName} pasó al ${data.localDate} a las ${data.localTime}.`,
          `reschedule:${id}:${data.localDate}:${data.localTime}`,
          business.whatsappPhone,
        );
      }
      if (previous.status !== "cancelled" && data.status === "cancelled") {
        await pushNotice(
          db,
          "cancel",
          "Cita cancelada",
          `Se canceló ${serviceName} de ${clientName} (${data.localDate} ${data.localTime}).`,
          `cancel:${id}:${data.localDate}:${data.localTime}`,
          business.whatsappPhone,
        );
      }
    }
  });

  const saved = await getAppointment(id);
  if (!saved) throw new Error("No se pudo guardar la cita");
  return saved;
}

export async function setAppointmentStatus(
  id: string,
  status: string,
  paymentMethod?: string | null,
): Promise<Appointment> {
  const cleanStatus = clip(status, 20);
  if (!STATUS_IDS.has(cleanStatus)) throw new Error("Estado no válido");
  const payment = paymentMethod ? clip(paymentMethod, 20) : null;
  if (cleanStatus === "completed" && (!payment || !METHOD_IDS.has(payment))) {
    throw new Error("Indica el método de pago para completar la cita");
  }
  const db = await getDb();
  const business = await getBusiness();
  if (!business) throw new Error("Primero configura tu negocio");
  assertPaymentAllowed(business, payment);
  const current = await getAppointment(id);
  if (!current) throw new Error("Cita no encontrada");

  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`
      UPDATE appointments SET status = ${cleanStatus},
        payment_method = ${cleanStatus === "completed" ? payment : current.paymentMethod},
        updated_at = ${now}
      WHERE id = ${id}
    `;
    await enqueueOutbox(db, "appointment", id, "update", { status: cleanStatus });

    if (cleanStatus === "completed" && payment) {
      await recordIncomeForAppointment(db, {
        id,
        priceCents: current.priceCents,
        method: payment,
        serviceName: current.serviceName,
        employeeId: current.employeeId,
        employeeName: current.employeeName,
        localDate: current.localDate,
      });
    } else if (current.status === "completed") {
      await clearIncomeForAppointment(db, id);
    }

    if (cleanStatus === "cancelled" && current.status !== "cancelled") {
      await pushNotice(
        db,
        "cancel",
        "Cita cancelada",
        `Se canceló ${current.serviceName} de ${current.clientName}.`,
        `cancel:${id}:${current.localDate}:${current.localTime}`,
        business.whatsappPhone,
      );
    }
  });
  const saved = await getAppointment(id);
  if (!saved) throw new Error("No se pudo actualizar");
  return saved;
}

export async function deleteAppointment(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await clearIncomeForAppointment(db, id);
    await db.sql`UPDATE appointments SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
    await enqueueOutbox(db, "appointment", id, "delete");
  });
}

export function isActiveStatus(status: AppointmentStatus): boolean {
  return status === "pending" || status === "confirmed" || status === "in_progress";
}
