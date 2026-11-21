import * as SQLite from "expo-sqlite";
import { DATABASE_NAME, SCHEMA_VERSION, MIGRATIONS } from "./migrations";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    await migrate(db);
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => undefined);
    throw error;
  }
}

/**
 * Aplica cada migración pendiente en su propia transacción, junto con el
 * cambio de `user_version`. Si una falla, se revierte completa y la base
 * queda en la última versión válida.
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    // Nada más usa la conexión hasta que `getDb()` resuelve, así que la
    // transacción normal no se mezcla con otras consultas.
    await db.withTransactionAsync(async () => {
      if (migration.sql) await db.execAsync(migration.sql);
      if (migration.run) await migration.run(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

/**
 * Única conexión a la base de datos local del dispositivo.
 * Si la apertura falla, se descarta la promesa para poder reintentar.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/**
 * Cierra la conexión actual y abre una nueva (vuelve a correr migraciones).
 * Se usa después de restaurar un respaldo.
 */
export async function reopenDb(): Promise<SQLite.SQLiteDatabase> {
  const current = dbPromise;
  dbPromise = null;
  if (current) {
    const db = await current.catch(() => null);
    await db?.closeAsync().catch(() => undefined);
  }
  return getDb();
}

export type Db = Awaited<ReturnType<typeof getDb>>;

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export async function nowIso(): Promise<string> {
  return new Date().toISOString();
}
