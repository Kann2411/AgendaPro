import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { useRouter } from "expo-router";
import { listAppointments } from "@/data/repositories/appointments-repository";
import { getBusiness } from "@/data/repositories/business-repository";
import { formatDuration } from "@/domain/format";
import { addDays, addMinutes, formatTime, isoToday, minutes, parseDay } from "@/domain/time";
import { usePreferences } from "@/state/preferences";

/**
 * Recordatorios locales: se programan en el propio celular, sin backend.
 * La fuente de verdad es la base local; `syncReminders()` borra y vuelve a
 * programar todo, así nunca quedan avisos de citas movidas o canceladas.
 */

const CHANNEL_ID = "citas";
const APPT_PREFIX = "appt:";
const DAILY_ID = "daily-summary";
/** Android limita la cantidad de alarmas por app; con esto sobra. */
const MAX_SCHEDULED = 60;
const HORIZON_DAYS = 30;
const ACTIVE = new Set(["pending", "confirmed", "in_progress"]);

export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Recordatorios de citas",
    description: "Avisos antes de cada cita y resumen del día",
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
  });
}

export type ReminderPermission = "granted" | "denied" | "undetermined";

export async function reminderPermission(): Promise<ReminderPermission> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  return current.canAskAgain ? "undetermined" : "denied";
}

/** Crea el canal (Android 13+ lo exige antes del diálogo) y pide permiso si se puede. */
export async function requestReminderPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function localDate(day: string, hhmm: string): Date {
  const d = parseDay(day);
  const m = minutes(hhmm);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

let queue: Promise<unknown> = Promise.resolve();

/** Reprograma todos los recordatorios. Las llamadas se encolan para no pisarse. */
export function syncReminders(): Promise<number> {
  const run = queue.then(doSync, doSync);
  queue = run.catch(() => undefined);
  return run;
}

async function doSync(): Promise<number> {
  const { remindersEnabled, reminderMinutes, dailySummary } = usePreferences.getState();
  const perm = await Notifications.getPermissionsAsync();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(APPT_PREFIX) || n.identifier === DAILY_ID)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!perm.granted) return 0;
  await ensureChannel();

  const business = await getBusiness();
  if (!business) return 0;
  let count = 0;

  if (remindersEnabled) {
    const today = isoToday();
    const now = Date.now();
    const appts = (await listAppointments(today, addDays(today, HORIZON_DAYS)))
      .filter((a) => ACTIVE.has(a.status))
      .slice(0, MAX_SCHEDULED);
    for (const a of appts) {
      const fireAt = localDate(a.localDate, a.localTime).getTime() - reminderMinutes * 60_000;
      if (fireAt < now + 5_000) continue;
      const who = [a.clientName, a.petName].filter(Boolean).join(" · ");
      await Notifications.scheduleNotificationAsync({
        identifier: `${APPT_PREFIX}${a.id}`,
        content: {
          title: `Cita en ${formatDuration(reminderMinutes)}`,
          body: `${formatTime(a.localTime)} — ${who} · ${a.serviceName}${a.employeeName ? ` con ${a.employeeName}` : ""}`,
          data: { appointmentId: a.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNEL_ID },
      });
      count += 1;
    }
  }

  if (dailySummary) {
    const at = addMinutes(business.openTime, -15).hhmm;
    const [hour, minute] = at.split(":").map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: `Buenos días, ${business.name}`,
        body: "Revisa las citas de hoy en AgendaPro.",
        data: { route: "/agenda" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hour ?? 8,
        minute: minute ?? 45,
        channelId: CHANNEL_ID,
      },
    });
  }
  return count;
}

/** Al tocar una notificación, abre la cita (o la agenda) correspondiente. */
export function useNotificationNavigation(): void {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = response.notification.request.content.data as { appointmentId?: string; route?: string };
    if (data?.appointmentId) {
      router.push({ pathname: "/appointment/[id]", params: { id: data.appointmentId } });
    } else if (data?.route === "/agenda") {
      router.push("/(tabs)/agenda");
    }
    Notifications.clearLastNotificationResponse();
  }, [response, router]);
}
