import type { BusinessType } from "./types";

export type ServiceTemplate = {
  name: string;
  category: string;
  priceCents: number;
  durationMin: number;
  description: string;
};

const GROOMER: ServiceTemplate[] = [
  { name: "Baño", category: "Higiene", priceCents: 25000, durationMin: 45, description: "Baño con shampoo neutro, secado y perfume." },
  { name: "Corte de pelo", category: "Estética", priceCents: 35000, durationMin: 60, description: "Corte según raza o preferencia del tutor." },
  { name: "Corte de uñas", category: "Higiene", priceCents: 8000, durationMin: 15, description: "Recorte y limado de uñas." },
  { name: "Limpieza de oídos", category: "Higiene", priceCents: 7000, durationMin: 15, description: "Limpieza externa del canal auditivo." },
  { name: "Cepillado", category: "Estética", priceCents: 15000, durationMin: 30, description: "Desenredo y cepillado del manto." },
  { name: "Baño medicado", category: "Salud", priceCents: 40000, durationMin: 50, description: "Baño con producto indicado por el veterinario." },
  { name: "Servicio completo", category: "Paquetes", priceCents: 65000, durationMin: 90, description: "Baño, corte, uñas, oídos y cepillado." },
];

const SALON: ServiceTemplate[] = [
  { name: "Corte", category: "Cabello", priceCents: 25000, durationMin: 45, description: "Corte y peinado básico." },
  { name: "Color", category: "Cabello", priceCents: 80000, durationMin: 120, description: "Coloración completa." },
  { name: "Peinado", category: "Cabello", priceCents: 35000, durationMin: 50, description: "Peinado para evento o diario." },
  { name: "Tratamiento", category: "Cuidado", priceCents: 45000, durationMin: 60, description: "Hidratación o reparación." },
];

const BARBER: ServiceTemplate[] = [
  { name: "Corte clásico", category: "Corte", priceCents: 18000, durationMin: 30, description: "Corte con máquina y tijera." },
  { name: "Corte y barba", category: "Paquetes", priceCents: 28000, durationMin: 50, description: "Corte más perfilado de barba." },
  { name: "Afeitado", category: "Barba", priceCents: 15000, durationMin: 30, description: "Afeitado tradicional." },
  { name: "Perfilado de barba", category: "Barba", priceCents: 12000, durationMin: 20, description: "Diseño y limpieza de barba." },
];

const AESTHETIC: ServiceTemplate[] = [
  { name: "Limpieza facial", category: "Facial", priceCents: 50000, durationMin: 60, description: "Limpieza profunda de cutis." },
  { name: "Masaje", category: "Corporal", priceCents: 60000, durationMin: 60, description: "Masaje relajante." },
  { name: "Depilación", category: "Corporal", priceCents: 25000, durationMin: 30, description: "Depilación de zona." },
];

const PET_SHOP: ServiceTemplate[] = [
  { name: "Asesoría de alimento", category: "Asesoría", priceCents: 0, durationMin: 20, description: "Recomendación de dieta según la mascota." },
  { name: "Baño express", category: "Grooming", priceCents: 22000, durationMin: 40, description: "Baño y secado." },
  { name: "Corte", category: "Grooming", priceCents: 32000, durationMin: 50, description: "Corte de mantenimiento." },
];

const OTHER: ServiceTemplate[] = [
  { name: "Consulta", category: "General", priceCents: 30000, durationMin: 45, description: "Sesión inicial." },
  { name: "Servicio principal", category: "General", priceCents: 40000, durationMin: 60, description: "Servicio más solicitado." },
];

const BY_TYPE: Record<BusinessType, ServiceTemplate[]> = {
  groomer: GROOMER,
  pet_shop: PET_SHOP,
  salon: SALON,
  barber: BARBER,
  aesthetic: AESTHETIC,
  other: OTHER,
};

export function suggestedServices(type: BusinessType): ServiceTemplate[] {
  return BY_TYPE[type] ?? OTHER;
}
