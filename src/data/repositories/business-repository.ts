import { getDb } from "../db/database";
import { enqueueOutbox } from "../db/outbox";
import { mapBusiness } from "../mappers";
import {
  clip,
  daysToStr,
  imageOrNull,
  parseDays,
  parseMethods,
  validateBusinessInput,
} from "@/domain/validation";
import type { Business } from "@/domain/types";
import { newId } from "@/utils/id";

export type BusinessInput = {
  name: string;
  logoData?: string | null;
  colorPrimary: string;
  colorSecondary: string;
  theme: string;
  businessType: string;
  tracksPets: boolean;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  locale: string;
  openTime: string;
  closeTime: string;
  workDays: number[];
  paymentMethods: string[];
  whatsappPhone?: string;
};

export async function getBusiness(): Promise<Business | null> {
  const db = await getDb();
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM business WHERE deleted_at IS NULL LIMIT 1`;
  return rows[0] ? mapBusiness(rows[0]) : null;
}

export async function saveBusiness(input: BusinessInput): Promise<Business> {
  validateBusinessInput(input);
  const db = await getDb();
  const existing = await db.sql<{ id: string }>`SELECT id FROM business WHERE deleted_at IS NULL LIMIT 1`;
  const id = existing[0]?.id ?? newId("b_");
  const now = new Date().toISOString();
  const workDays = daysToStr(parseDays(input.workDays));
  const methods = parseMethods(input.paymentMethods).join(",");
  const logo = input.logoData === undefined ? undefined : imageOrNull(input.logoData);
  const theme = input.theme === "dark" || input.theme === "system" ? input.theme : "light";
  const currency = clip(input.currency, 8).toUpperCase();

  await db.withTransactionAsync(async () => {
    if (logo === undefined) {
      await db.sql`
        INSERT INTO business (
          id, name, color_primary, color_secondary, theme, business_type, tracks_pets,
          address, phone, email, currency, locale, open_time, close_time, work_days,
          payment_methods, whatsapp_phone, updated_at
        ) VALUES (
          ${id}, ${clip(input.name, 80)}, ${input.colorPrimary}, ${input.colorSecondary}, ${theme},
          ${input.businessType}, ${input.tracksPets ? 1 : 0}, ${clip(input.address, 240)},
          ${clip(input.phone, 40)}, ${clip(input.email, 160)}, ${currency}, ${clip(input.locale, 12)},
          ${input.openTime}, ${input.closeTime}, ${workDays}, ${methods},
          ${clip(input.whatsappPhone, 40)}, ${now}
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, color_primary = excluded.color_primary,
          color_secondary = excluded.color_secondary, theme = excluded.theme,
          business_type = excluded.business_type, tracks_pets = excluded.tracks_pets,
          address = excluded.address, phone = excluded.phone, email = excluded.email,
          currency = excluded.currency, locale = excluded.locale, open_time = excluded.open_time,
          close_time = excluded.close_time, work_days = excluded.work_days,
          payment_methods = excluded.payment_methods, whatsapp_phone = excluded.whatsapp_phone,
          updated_at = excluded.updated_at
      `;
    } else {
      await db.sql`
        INSERT INTO business (
          id, name, logo_data, color_primary, color_secondary, theme, business_type, tracks_pets,
          address, phone, email, currency, locale, open_time, close_time, work_days,
          payment_methods, whatsapp_phone, updated_at
        ) VALUES (
          ${id}, ${clip(input.name, 80)}, ${logo}, ${input.colorPrimary}, ${input.colorSecondary}, ${theme},
          ${input.businessType}, ${input.tracksPets ? 1 : 0}, ${clip(input.address, 240)},
          ${clip(input.phone, 40)}, ${clip(input.email, 160)}, ${currency}, ${clip(input.locale, 12)},
          ${input.openTime}, ${input.closeTime}, ${workDays}, ${methods},
          ${clip(input.whatsappPhone, 40)}, ${now}
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name, logo_data = excluded.logo_data, color_primary = excluded.color_primary,
          color_secondary = excluded.color_secondary, theme = excluded.theme,
          business_type = excluded.business_type, tracks_pets = excluded.tracks_pets,
          address = excluded.address, phone = excluded.phone, email = excluded.email,
          currency = excluded.currency, locale = excluded.locale, open_time = excluded.open_time,
          close_time = excluded.close_time, work_days = excluded.work_days,
          payment_methods = excluded.payment_methods, whatsapp_phone = excluded.whatsapp_phone,
          updated_at = excluded.updated_at
      `;
    }
    await enqueueOutbox(db, "business", id, "update", { name: input.name });
  });

  const saved = await getBusiness();
  if (!saved) throw new Error("No se pudo guardar el negocio");
  return saved;
}
