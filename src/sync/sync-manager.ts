import { getDb } from "@/data/db/database";
import { bumpOutboxAttempts, countPendingOutbox, listPendingOutbox, markOutboxSynced } from "@/data/db/outbox";
import type { SyncAdapter, PushResult } from "./sync-adapter";

let adapter: SyncAdapter | null = null;
let running = false;

export function configureSyncAdapter(next: SyncAdapter | null): void {
  adapter = next;
}

export function syncStatus(): { enabled: boolean; adapter: string | null; running: boolean } {
  return { enabled: !!adapter, adapter: adapter?.name ?? null, running };
}

export async function pendingChanges(): Promise<number> {
  return countPendingOutbox(await getDb());
}

export async function runSync(): Promise<PushResult & { skipped?: boolean }> {
  if (!adapter || running) return { syncedIds: [], failedIds: [], skipped: true };
  running = true;
  try {
    const db = await getDb();
    const events = await listPendingOutbox(db);
    if (!events.length) {
      await adapter.pull?.(db);
      return { syncedIds: [], failedIds: [] };
    }
    const result = await adapter.push(db, events);
    if (result.syncedIds.length) await markOutboxSynced(db, result.syncedIds);
    if (result.failedIds.length) await bumpOutboxAttempts(db, result.failedIds);
    if (!result.failedIds.length) await adapter.pull?.(db);
    return result;
  } finally {
    running = false;
  }
}
