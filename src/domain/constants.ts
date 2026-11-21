import {
  BUSINESS_TYPES,
  PAYMENT_METHODS,
  STATUSES,
  type BusinessType,
  type PaymentMethod,
} from "./types";

export const STATUS_IDS = new Set<string>(STATUSES.map((s) => s.id));
export const METHOD_IDS = new Set<string>(PAYMENT_METHODS.map((m) => m.id));
export const TYPES = new Set<string>(BUSINESS_TYPES.map((b) => b.id));

export const METHOD_VALUES = PAYMENT_METHODS.map((m) => m.id) as PaymentMethod[];
export const TYPE_VALUES = BUSINESS_TYPES.map((b) => b.id) as BusinessType[];
