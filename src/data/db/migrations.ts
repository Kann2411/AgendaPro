/**
 * Migraciones versionadas de SQLite local.
 * Cada versión es acumulativa y se aplica una sola vez usando PRAGMA user_version.
 * Las columnas de sincronización (updated_at, deleted_at) existen desde la
 * versión 1 para no reescribir datos cuando se active la nube.
 */
import type { SQLiteDatabase } from "expo-sqlite";
import { deviceTzOffsetMinutes, toUtcIso } from "@/domain/time";

export type Migration = {
  version: number;
  sql?: string;
  /** Paso opcional en JS para transformar datos existentes. */
  run?: (db: SQLiteDatabase) => Promise<void>;
};

/**
 * v1 guardaba `starts_at`/`ends_at` con el desfase horario invertido.
 * Se recalculan desde `local_date`/`local_time` (la fuente de verdad) con
 * la zona del dispositivo, para que la detección de choques compare
 * valores coherentes con las citas nuevas.
 */
async function fixAppointmentUtc(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{
    id: string;
    local_date: string;
    local_time: string;
    duration_min: number;
  }>("SELECT id, local_date, local_time, duration_min FROM appointments");
  for (const row of rows) {
    const offset = deviceTzOffsetMinutes(row.local_date, row.local_time);
    const startsAt = toUtcIso(row.local_date, row.local_time, offset);
    const endsAt = new Date(new Date(startsAt).getTime() + Number(row.duration_min) * 60_000).toISOString();
    await db.runAsync("UPDATE appointments SET starts_at = ?, ends_at = ? WHERE id = ?", [startsAt, endsAt, row.id]);
  }
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS business (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        logo_data TEXT,
        color_primary TEXT NOT NULL,
        color_secondary TEXT NOT NULL,
        theme TEXT NOT NULL DEFAULT 'light',
        business_type TEXT NOT NULL,
        tracks_pets INTEGER NOT NULL DEFAULT 0,
        address TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        currency TEXT NOT NULL DEFAULT 'MXN',
        locale TEXT NOT NULL DEFAULT 'es-MX',
        open_time TEXT NOT NULL DEFAULT '09:00',
        close_time TEXT NOT NULL DEFAULT '18:00',
        work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
        payment_methods TEXT NOT NULL DEFAULT 'cash',
        whatsapp_phone TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        price_cents INTEGER NOT NULL DEFAULT 0,
        duration_min INTEGER NOT NULL DEFAULT 30,
        active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        photo_data TEXT,
        phone TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        work_start TEXT NOT NULL DEFAULT '09:00',
        work_end TEXT NOT NULL DEFAULT '18:00',
        work_days TEXT NOT NULL DEFAULT '1,2,3,4,5',
        service_ids TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(full_name);
      CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

      CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        species TEXT NOT NULL DEFAULT '',
        breed TEXT NOT NULL DEFAULT '',
        age_years INTEGER,
        weight_g INTEGER,
        health_notes TEXT NOT NULL DEFAULT '',
        grooming_prefs TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pets_client ON pets(client_id);

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY NOT NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL DEFAULT '',
        pet_name TEXT NOT NULL DEFAULT '',
        service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
        service_name TEXT NOT NULL,
        employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
        employee_name TEXT NOT NULL DEFAULT '',
        local_date TEXT NOT NULL,
        local_time TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        duration_min INTEGER NOT NULL,
        price_cents INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_appts_day ON appointments(local_date);
      CREATE INDEX IF NOT EXISTS idx_appts_employee_time ON appointments(employee_id, starts_at, ends_at);
      CREATE INDEX IF NOT EXISTS idx_appts_client ON appointments(client_id);
      CREATE INDEX IF NOT EXISTS idx_appts_status ON appointments(status);

      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY NOT NULL,
        appointment_id TEXT UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL DEFAULT 0,
        method TEXT NOT NULL,
        service_name TEXT NOT NULL DEFAULT '',
        employee_id TEXT,
        employee_name TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        occurred_on TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_incomes_day ON incomes(occurred_on);

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        amount_cents INTEGER NOT NULL DEFAULT 0,
        occurred_on TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_day ON expenses(occurred_on);

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        is_read INTEGER NOT NULL DEFAULT 0,
        dedupe_key TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        op TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        synced_at TEXT,
        attempts INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(synced_at, created_at);

      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    run: fixAppointmentUtc,
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;
export const DATABASE_NAME = "agendapro.db";
