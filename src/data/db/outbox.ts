import type { Db } from "./database";
import type { OutboxEvent } from "@/domain/types";
import { newId } from "@/utils/id";

type OutboxRow = {
  id: string;
  entity: string;
  entity_id: string;
  op: "insert" | "update" | "delete";
  payload: string;
  created_at: string;
  synced_at: string | null;
  attempts: number;
};

function map(row: OutboxRow): OutboxEvent {
  return {
    id: row.id,
    entity: row.entity,
    entityId: row.entity_id,
    op: row.op,
    payload: row.payload,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    attempts: row.attempts,
  };
}

/** Se llama DENTRO de la misma transacción que la escritura del dato. */
export async function enqueueOutbox(
  db: Db,
  entity: string,
  entityId: string,
  op: "insert" | "update" | "delete",
  payload: unknown = {},
): Promise<void> {
  const id = newId("o_");
  const createdAt = new Date().toISOString();
  await db.sql`
    INSERT INTO outbox (id, entity, entity_id, op, payload, created_at)
    VALUES (${id}, ${entity}, ${entityId}, ${op}, ${JSON.stringify(payload)}, ${createdAt})
  `;
}

export async function listPendingOutbox(db: Db, limit = 200): Promise<OutboxEvent[]> {
  const rows = await db.sql<OutboxRow>`
    SELECT * FROM outbox WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ${limit}
  `;
  return rows.map(map);
}

export async function countPendingOutbox(db: Db): Promise<number> {
  const row = await db.sql<{ n: number }>`SELECT COUNT(*) AS n FROM outbox WHERE synced_at IS NULL`;
  return row[0]?.n ?? 0;
}

export async function markOutboxSynced(db: Db, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const syncedAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.sql`UPDATE outbox SET synced_at = ${syncedAt} WHERE id = ${id}`;
    }
  });
}

export async function bumpOutboxAttempts(db: Db, ids: string[]): Promise<void> {
  for (const id of ids) {
    await db.sql`UPDATE outbox SET attempts = attempts + 1 WHERE id = ${id}`;
  }
}
