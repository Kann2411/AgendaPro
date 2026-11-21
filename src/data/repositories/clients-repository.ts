import { getDb } from "../db/database";
import { enqueueOutbox } from "../db/outbox";
import { mapAppointment, mapClient, mapPet } from "../mappers";
import { clip } from "@/domain/validation";
import type { Client, ClientProfile, Pet } from "@/domain/types";
import { newId } from "@/utils/id";
import { getBusiness } from "./business-repository";

async function petsFor(db: Awaited<ReturnType<typeof getDb>>, clientIds: string[]): Promise<Map<string, Pet[]>> {
  const map = new Map<string, Pet[]>();
  if (!clientIds.length) return map;
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM pets WHERE deleted_at IS NULL ORDER BY name
  `;
  for (const row of rows) {
    const clientId = String((row as Record<string, unknown>).client_id ?? "");
    if (!clientIds.includes(clientId)) continue;
    const list = map.get(clientId) ?? [];
    list.push(mapPet(row));
    map.set(clientId, list);
  }
  return map;
}

export async function listClients(q = ""): Promise<Client[]> {
  const db = await getDb();
  const needle = clip(q, 80);
  const like = `%${needle}%`;
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM clients
    WHERE deleted_at IS NULL
      AND (${needle} = '' OR full_name LIKE ${like} OR phone LIKE ${like} OR email LIKE ${like})
    ORDER BY full_name
    LIMIT 1000
  `;
  const pets = await petsFor(db, rows.map((r) => String((r as Record<string, unknown>).id ?? "")));
  return rows.map((r) => mapClient(r, pets.get(String((r as Record<string, unknown>).id ?? "")) ?? []));
}

export async function getClientProfile(id: string): Promise<ClientProfile | null> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM clients WHERE id = ${id} AND deleted_at IS NULL`;
  if (!rows[0]) return null;
  const pets = await petsFor(db, [id]);
  const apptRows = await db.sql<Record<string, unknown>>`
    SELECT * FROM appointments WHERE client_id = ${id} AND deleted_at IS NULL
    ORDER BY local_date DESC, local_time DESC LIMIT 2000
  `;
  const appointments = apptRows.map(mapAppointment);
  const totalSpent = appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + a.priceCents, 0);
  return {
    client: mapClient(rows[0], pets.get(id) ?? []),
    appointments,
    totalSpent,
    visits: appointments.filter((a) => a.status === "completed").length,
  };
}

export type ClientInput = {
  id?: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export async function saveClient(input: ClientInput): Promise<Client> {
  if (!(await getBusiness())) throw new Error("Primero configura tu negocio");
  const db = await getDb();
  const fullName = clip(input.fullName, 120);
  if (fullName.length < 2) throw new Error("Escribe el nombre del cliente");
  const email = clip(input.email, 160);
  if (email && !email.includes("@")) throw new Error("El correo no es válido");
  const id = input.id ?? newId("c_");
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (input.id) {
      await db.sql`
        UPDATE clients SET full_name = ${fullName}, phone = ${clip(input.phone, 40)}, email = ${email},
          address = ${clip(input.address, 240)}, notes = ${clip(input.notes, 2000)},
          updated_at = ${now}, deleted_at = NULL
        WHERE id = ${id}
      `;
    } else {
      await db.sql`
        INSERT INTO clients (id, full_name, phone, email, address, notes, created_at, updated_at)
        VALUES (${id}, ${fullName}, ${clip(input.phone, 40)}, ${email}, ${clip(input.address, 240)},
          ${clip(input.notes, 2000)}, ${now}, ${now})
      `;
    }
    await enqueueOutbox(db, "client", id, input.id ? "update" : "insert", { fullName });
  });
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM clients WHERE id = ${id}`;
  const pets = await petsFor(db, [id]);
  return mapClient(rows[0]!, pets.get(id) ?? []);
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`UPDATE appointments SET client_id = NULL WHERE client_id = ${id}`;
    await db.sql`UPDATE pets SET deleted_at = ${now}, updated_at = ${now} WHERE client_id = ${id}`;
    await db.sql`UPDATE clients SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
    await enqueueOutbox(db, "client", id, "delete");
  });
}

export type PetInput = {
  id?: string;
  clientId: string;
  name: string;
  species?: string;
  breed?: string;
  ageYears?: number | null;
  weightG?: number | null;
  healthNotes?: string;
  groomingPrefs?: string;
};

export async function savePet(input: PetInput): Promise<Pet> {
  const db = await getDb();
  const clientId = clip(input.clientId, 80);
  const owned = await db.sql<Record<string, unknown>>`SELECT id FROM clients WHERE id = ${clientId} AND deleted_at IS NULL`;
  if (!owned[0]) throw new Error("Cliente no encontrado");
  const name = clip(input.name, 80);
  if (!name) throw new Error("Escribe el nombre de la mascota");
  const age = input.ageYears == null || input.ageYears === ("" as unknown) ? null : Math.round(Number(input.ageYears));
  const weight = input.weightG == null || input.weightG === ("" as unknown) ? null : Math.round(Number(input.weightG));
  if (age != null && (!Number.isFinite(age) || age < 0 || age > 50)) throw new Error("La edad no es válida");
  if (weight != null && (!Number.isFinite(weight) || weight < 0 || weight > 200_000)) {
    throw new Error("El peso no es válido");
  }
  const id = input.id ?? newId("p_");
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.sql`
      INSERT INTO pets (
        id, client_id, name, species, breed, age_years, weight_g, health_notes, grooming_prefs, updated_at
      ) VALUES (
        ${id}, ${clientId}, ${name}, ${clip(input.species, 40)}, ${clip(input.breed, 60)},
        ${age}, ${weight}, ${clip(input.healthNotes, 500)}, ${clip(input.groomingPrefs, 500)}, ${now}
      )
      ON CONFLICT(id) DO UPDATE SET
        client_id = excluded.client_id, name = excluded.name, species = excluded.species,
        breed = excluded.breed, age_years = excluded.age_years, weight_g = excluded.weight_g,
        health_notes = excluded.health_notes, grooming_prefs = excluded.grooming_prefs,
        updated_at = excluded.updated_at, deleted_at = NULL
    `;
    await enqueueOutbox(db, "pet", id, input.id ? "update" : "insert", { name, clientId });
  });
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM pets WHERE id = ${id}`;
  return mapPet(rows[0]!);
}

export async function deletePet(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`UPDATE pets SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
    await enqueueOutbox(db, "pet", id, "delete");
  });
}
