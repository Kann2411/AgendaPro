import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as SQLite from "expo-sqlite";
import { format } from "date-fns";
import { getDb, getMeta, reopenDb, setMeta } from "@/data/db/database";
import { SCHEMA_VERSION } from "@/data/db/migrations";

/**
 * Respaldo y restauración de la base local. Como la app no tiene backend,
 * es la única forma de no perder datos al cambiar o resetear el celular.
 */

const LAST_BACKUP_KEY = "last_backup_at";
const RESTORE_TMP = "agendapro-restore.db";

/** Convierte `file:///ruta` a una ruta plana del sistema (la que entiende SQLite). */
function toPath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, "")).replace(/\/+$/, "");
}

export async function lastBackupAt(): Promise<string | null> {
  return getMeta(LAST_BACKUP_KEY);
}

/**
 * Genera una copia compacta y consistente de la base (`VACUUM INTO`) y abre
 * el diálogo de compartir para guardarla en Drive, WhatsApp, correo, etc.
 */
export async function exportBackup(): Promise<{ fileName: string; shared: boolean }> {
  const db = await getDb();
  const fileName = `agendapro-respaldo-${format(new Date(), "yyyyMMdd-HHmm")}.db`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();

  // Se registra antes de copiar para que el respaldo lo incluya.
  await setMeta(LAST_BACKUP_KEY, new Date().toISOString());
  const path = toPath(file.uri).replace(/'/g, "''");
  await db.execAsync(`VACUUM INTO '${path}'`);

  if (!(await Sharing.isAvailableAsync())) return { fileName, shared: false };
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/octet-stream",
    dialogTitle: "Guardar respaldo de AgendaPro",
  });
  return { fileName, shared: true };
}

async function validateBackup(db: SQLite.SQLiteDatabase): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const v = version?.user_version ?? 0;
  if (v < 1) throw new Error("El archivo no es un respaldo de AgendaPro.");
  if (v > SCHEMA_VERSION) {
    throw new Error("Este respaldo es de una versión más nueva de la app. Actualiza AgendaPro primero.");
  }
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('business', 'appointments', 'clients')",
  );
  if (tables.length < 3) throw new Error("El archivo no es un respaldo de AgendaPro.");
  const check = await db.getFirstAsync<{ quick_check: string }>("PRAGMA quick_check");
  if (check?.quick_check !== "ok") throw new Error("El respaldo está dañado.");
}

/**
 * Deja elegir un archivo de respaldo, lo valida y reemplaza TODOS los datos
 * actuales con su contenido. Devuelve `false` si el usuario canceló.
 */
export async function pickAndRestoreBackup(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return false;

  const tmp = new File(Paths.cache, RESTORE_TMP);
  if (tmp.exists) tmp.delete();
  await new File(result.assets[0].uri).copy(tmp);

  let imported: SQLite.SQLiteDatabase | null = null;
  try {
    imported = await SQLite.openDatabaseAsync(RESTORE_TMP, {}, toPath(Paths.cache.uri));
    await validateBackup(imported);
    const main = await getDb();
    await SQLite.backupDatabaseAsync({ sourceDatabase: imported, destDatabase: main });
  } catch (error) {
    if (error instanceof Error && /respaldo|AgendaPro/.test(error.message)) throw error;
    throw new Error("No se pudo leer el archivo. Asegúrate de elegir un respaldo .db de AgendaPro.");
  } finally {
    await imported?.closeAsync().catch(() => undefined);
    if (tmp.exists) tmp.delete();
  }

  // Reabre para aplicar migraciones si el respaldo era de una versión anterior.
  await reopenDb();
  return true;
}
