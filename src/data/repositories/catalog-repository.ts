import { getDb } from "../db/database";
import { enqueueOutbox } from "../db/outbox";
import { mapEmployee, mapService } from "../mappers";
import { suggestedServices } from "@/domain/catalog";
import { minutes } from "@/domain/time";
import { clip, daysToStr, imageOrNull, parseDays, reqTime } from "@/domain/validation";
import type { Employee, Service } from "@/domain/types";
import { newId } from "@/utils/id";
import { getBusiness } from "./business-repository";

/* ---------------------------------- Servicios --------------------------------- */

export async function listServices(): Promise<Service[]> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM services WHERE deleted_at IS NULL ORDER BY category, name
  `;
  return rows.map(mapService);
}

export type ServiceInput = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  priceCents: number;
  durationMin: number;
  active: boolean;
};

export async function saveService(input: ServiceInput): Promise<Service> {
  const db = await getDb();
  if (!(await getBusiness())) throw new Error("Primero configura tu negocio");
  const name = clip(input.name, 80);
  if (name.length < 2) throw new Error("Escribe el nombre del servicio");
  const priceCents = Math.round(Number(input.priceCents));
  const durationMin = Math.round(Number(input.durationMin));
  if (!Number.isFinite(priceCents) || priceCents < 0 || priceCents > 100_000_000) {
    throw new Error("Precio no válido");
  }
  if (!Number.isFinite(durationMin) || durationMin < 5 || durationMin > 600) {
    throw new Error("Duración no válida");
  }
  const id = input.id ?? newId("s_");
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`
      INSERT INTO services (
        id, name, description, category, price_cents, duration_min, active, updated_at
      ) VALUES (
        ${id}, ${name}, ${clip(input.description, 500)}, ${clip(input.category, 60)},
        ${priceCents}, ${durationMin}, ${input.active ? 1 : 0}, ${now}
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description, category = excluded.category,
        price_cents = excluded.price_cents, duration_min = excluded.duration_min,
        active = excluded.active, updated_at = excluded.updated_at, deleted_at = NULL
    `;
    await enqueueOutbox(db, "service", id, input.id ? "update" : "insert", { name });
  });
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM services WHERE id = ${id}`;
  return mapService(rows[0]!);
}

export async function deleteService(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`
      UPDATE appointments SET service_id = NULL, service_name = service_name WHERE service_id = ${id}
    `;
    await db.sql`UPDATE services SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
    await enqueueOutbox(db, "service", id, "delete");
  });
}

export async function seedSuggestedServices(): Promise<number> {
  const db = await getDb();
  const business = await getBusiness();
  if (!business) throw new Error("Primero configura tu negocio");
  const existing = await db.sql<{ name: string }>`SELECT name FROM services WHERE deleted_at IS NULL`;
  const have = new Set(existing.map((r) => r.name.toLowerCase()));
  const templates = suggestedServices(business.businessType);
  const now = new Date().toISOString();
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const item of templates) {
      if (have.has(item.name.toLowerCase())) continue;
      const id = newId("s_");
      await db.sql`
        INSERT INTO services (id, name, description, category, price_cents, duration_min, active, updated_at)
        VALUES (${id}, ${item.name}, ${item.description}, ${item.category}, ${item.priceCents},
          ${item.durationMin}, 1, ${now})
      `;
      await enqueueOutbox(db, "service", id, "insert", { name: item.name });
      added += 1;
    }
  });
  return added;
}

/* ---------------------------------- Empleados --------------------------------- */

export async function listEmployees(): Promise<Employee[]> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY name`;
  return rows.map(mapEmployee);
}

export type EmployeeInput = {
  id?: string;
  name: string;
  photoData?: string | null;
  phone?: string;
  role?: string;
  workStart: string;
  workEnd: string;
  workDays: number[];
  serviceIds: string[];
  active: boolean;
};

export async function saveEmployee(input: EmployeeInput): Promise<Employee> {
  const db = await getDb();
  if (!(await getBusiness())) throw new Error("Primero configura tu negocio");
  const name = clip(input.name, 80);
  if (name.length < 2) throw new Error("Escribe el nombre del empleado");
  const workStart = reqTime(input.workStart, "La entrada");
  const workEnd = reqTime(input.workEnd, "La salida");
  if (minutes(workStart) >= minutes(workEnd)) throw new Error("La salida debe ser después de la entrada");
  const workDays = parseDays(input.workDays);
  const photo = input.photoData === undefined ? undefined : imageOrNull(input.photoData);
  const serviceIds = (input.serviceIds ?? []).map((id) => clip(id, 80)).filter(Boolean).slice(0, 40).join(",");
  const id = input.id ?? newId("e_");
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (photo === undefined) {
      await db.sql`
        INSERT INTO employees (
          id, name, phone, role, work_start, work_end, work_days, service_ids, active, updated_at
        ) VALUES (
          ${id}, ${name}, ${clip(input.phone, 40)}, ${clip(input.role, 60)}, ${workStart}, ${workEnd},
          ${daysToStr(workDays)}, ${serviceIds}, ${input.active ? 1 : 0}, ${now}
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, phone = excluded.phone, role = excluded.role,
          work_start = excluded.work_start, work_end = excluded.work_end,
          work_days = excluded.work_days, service_ids = excluded.service_ids,
          active = excluded.active, updated_at = excluded.updated_at, deleted_at = NULL
      `;
    } else {
      await db.sql`
        INSERT INTO employees (
          id, name, photo_data, phone, role, work_start, work_end, work_days, service_ids, active, updated_at
        ) VALUES (
          ${id}, ${name}, ${photo}, ${clip(input.phone, 40)}, ${clip(input.role, 60)}, ${workStart}, ${workEnd},
          ${daysToStr(workDays)}, ${serviceIds}, ${input.active ? 1 : 0}, ${now}
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, photo_data = excluded.photo_data, phone = excluded.phone,
          role = excluded.role, work_start = excluded.work_start, work_end = excluded.work_end,
          work_days = excluded.work_days, service_ids = excluded.service_ids,
          active = excluded.active, updated_at = excluded.updated_at, deleted_at = NULL
      `;
    }
    await enqueueOutbox(db, "employee", id, input.id ? "update" : "insert", { name });
  });
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM employees WHERE id = ${id}`;
  return mapEmployee(rows[0]!);
}

export async function deleteEmployee(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`UPDATE appointments SET employee_id = NULL, employee_name = employee_name WHERE employee_id = ${id}`;
    await db.sql`UPDATE employees SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
    await enqueueOutbox(db, "employee", id, "delete");
  });
}

/** Usado por las reglas de citas: solo empleados activos. */
export async function getEmployeeForBooking(id: string): Promise<Employee | null> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM employees WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows[0]) return null;
  const employee = mapEmployee(rows[0]);
  return employee.active ? employee : null;
}
