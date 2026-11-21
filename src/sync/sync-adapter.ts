import type { Db } from "@/data/db/database";
import type { OutboxEvent } from "@/domain/types";

export type PushResult = {
  syncedIds: string[];
  failedIds: string[];
};

/**
 * Contrato que deberá implementar el futuro backend (Supabase, Firestore,
 * API propia...). La fase 1 no registra ningún adaptador: los eventos se
 * acumulan en la tabla `outbox` y no se pierden.
 */
export interface SyncAdapter {
  readonly name: string;
  push(db: Db, events: OutboxEvent[]): Promise<PushResult>;
  pull?(db: Db): Promise<void>;
}
