import { Linking } from "react-native";
import { formatLongDay, formatTime } from "@/domain/time";
import type { Appointment, Business } from "@/domain/types";

/**
 * Contacto con el cliente sin backend: abre WhatsApp (wa.me) con el mensaje
 * ya escrito, o el marcador del teléfono. El envío lo confirma el usuario.
 */

const COUNTRY_CODES: Record<string, string> = {
  "es-MX": "52",
  "es-CO": "57",
  "es-AR": "54",
  "es-ES": "34",
  "en-US": "1",
};

/**
 * Normaliza a formato internacional sin "+" (lo que pide wa.me).
 * Si el número no trae lada de país, usa la del idioma del negocio.
 */
export function toWhatsAppNumber(raw: string, locale = "es-MX"): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (!trimmed.startsWith("+") && digits.length <= 10) {
    digits = `${COUNTRY_CODES[locale] ?? "52"}${digits}`;
  }
  return digits.length >= 8 ? digits : null;
}

export async function openWhatsApp(phone: string, text: string, locale?: string): Promise<void> {
  const number = toWhatsAppNumber(phone, locale);
  if (!number) throw new Error("El teléfono no es válido para WhatsApp.");
  const url = `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error("No se pudo abrir WhatsApp en este celular.");
  }
}

export async function callPhone(phone: string): Promise<void> {
  const clean = phone.replace(/[^\d+]/g, "");
  if (!clean) throw new Error("El teléfono no es válido.");
  try {
    await Linking.openURL(`tel:${clean}`);
  } catch {
    throw new Error("No se pudo abrir el marcador.");
  }
}

export type MessageTemplate = { id: string; label: string; icon: string; text: string };

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Mensajes listos para una cita: confirmación, recordatorio y agradecimiento. */
export type MessageAppointment = Pick<
  Appointment,
  "clientName" | "petName" | "serviceName" | "employeeName" | "localDate" | "localTime"
>;

export function appointmentMessages(appt: MessageAppointment, business: Business | null | undefined): MessageTemplate[] {
  const name = firstName(appt.clientName);
  const shop = business?.name ?? "nosotros";
  const when = `${formatLongDay(appt.localDate).toLowerCase()} a las ${formatTime(appt.localTime)}`;
  const forPet = appt.petName ? ` para ${appt.petName}` : "";
  const withWho = appt.employeeName ? ` con ${appt.employeeName}` : "";
  const where = business?.address ? `\n📍 ${business.address}` : "";
  return [
    {
      id: "confirm",
      label: "Confirmar cita",
      icon: "calendar-check",
      text: `Hola ${name} 👋, te escribimos de ${shop}. Tu cita de ${appt.serviceName}${forPet} quedó agendada el ${when}${withWho}.${where}\n\n¿Nos confirmas tu asistencia? ✅`,
    },
    {
      id: "remind",
      label: "Recordatorio",
      icon: "bell-ring-outline",
      text: `Hola ${name}, te recordamos tu cita de ${appt.serviceName}${forPet} el ${when} en ${shop}. ¡Te esperamos! 😊${where}`,
    },
    {
      id: "thanks",
      label: "Agradecer visita",
      icon: "heart-outline",
      text: `¡Gracias por tu visita, ${name}! 🙌 Fue un gusto atenderte${forPet} en ${shop}. Cuando quieras agendar de nuevo, escríbenos por aquí.`,
    },
    { id: "blank", label: "Mensaje en blanco", icon: "message-outline", text: "" },
  ];
}

/** Mensajes genéricos para un cliente (sin cita específica). */
export function clientMessages(clientName: string, business: Business | null | undefined): MessageTemplate[] {
  const name = firstName(clientName);
  const shop = business?.name ?? "nosotros";
  return [
    {
      id: "hello",
      label: "Saludo",
      icon: "hand-wave-outline",
      text: `Hola ${name} 👋, te escribimos de ${shop}.`,
    },
    {
      id: "comeback",
      label: "Invitar a agendar",
      icon: "calendar-plus",
      text: `Hola ${name} 👋, ¡te extrañamos en ${shop}! ¿Te gustaría agendar tu próxima cita? Tenemos horarios disponibles esta semana.`,
    },
    { id: "blank", label: "Mensaje en blanco", icon: "message-outline", text: "" },
  ];
}
