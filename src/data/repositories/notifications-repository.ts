import { getDb, type Db } from "../db/database";
import { mapNotification } from "../mappers";
import { addMinutes } from "@/domain/time";
import type { NotificationItem } from "@/domain/types";
import { newId } from "@/utils/id";
import { getBusiness } from "./business-repository";

export async function pushNotice(
  db: Db,
  kind: string,
  title: string,
  body: string,
  dedupe: string,
  whatsappPhone = "",
): Promise<void> {
  const id = newId("n_");
  const now = new Date().toISOString();
  const inserted = await db.sql<{ id: string }>`
    INSERT INTO notifications (id, kind, title, body, dedupe_key, created_at, updated_at)
    VALUES (${id}, ${kind}, ${title}, ${body}, ${dedupe}, ${now}, ${now})
    ON CONFLICT(dedupe_key) DO NOTHING
    RETURNING id
  `;
  if (!inserted[0]) return;
  await db.sql`
    INSERT INTO outbox (id, entity, entity_id, op, payload, created_at)
    VALUES (${newId("o_")}, 'notification', ${id}, 'insert', ${JSON.stringify({ channel: "in_app" })}, ${now})
  `;
  if (whatsappPhone.trim()) {
    await db.sql`
      INSERT INTO outbox (id, entity, entity_id, op, payload, created_at)
      VALUES (${newId("o_")}, 'notification', ${id}, 'insert', ${JSON.stringify({ channel: "whatsapp", status: "queued" })}, ${now})
    `;
  }
}

export async function syncNotices(day: string, nowTime: string): Promise<void> {
  const db = await getDb();
  const business = await getBusiness();
  if (!business) return;
  const active = await db.sql<{ n: number }>`
    SELECT COUNT(*) AS n FROM appointments
    WHERE deleted_at IS NULL AND local_date = ${day}
      AND status IN ('pending', 'confirmed', 'in_progress')
  `;
  const revenue = await db.sql<{ total: number }>`
    SELECT COALESCE(SUM(amount_cents), 0) AS total FROM incomes
    WHERE deleted_at IS NULL AND occurred_on = ${day}
  `;
  await db.withTransactionAsync(async () => {
    await pushNotice(
      db,
      "summary",
      "Resumen del día",
      `Tienes ${active[0]?.n ?? 0} citas activas hoy. Ingresos registrados: ${((numSafe(revenue[0]?.total) / 100).toFixed(2))} ${business.currency}.`,
      `summary:${day}`,
      business.whatsappPhone,
    );
    const soon = addMinutes(nowTime, 180).hhmm;
    const rows = await db.sql<Record<string, unknown>>`
      SELECT id, client_name, local_time, service_name FROM appointments
      WHERE deleted_at IS NULL AND local_date = ${day}
        AND status IN ('pending', 'confirmed', 'in_progress')
        AND local_time >= ${nowTime} AND local_time <= ${soon}
    `;
    for (const row of rows) {
      await pushNotice(
        db,
        "reminder",
        "Próxima cita",
        `${String(row.client_name ?? "")} · ${String(row.service_name ?? "")} a las ${String(row.local_time ?? "")}.`,
        `reminder:${String(row.id ?? "")}:${day}`,
        business.whatsappPhone,
      );
    }
  });
}

function numSafe(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function listNotifications(day: string, nowTime: string): Promise<NotificationItem[]> {
  await syncNotices(day, nowTime);
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM notifications WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100
  `;
  return rows.map(mapNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const db = await getDb();
  await db.sql`UPDATE notifications SET is_read = 1, updated_at = ${new Date().toISOString()} WHERE id = ${id}`;
}
