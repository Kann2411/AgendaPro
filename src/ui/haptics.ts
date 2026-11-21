import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Retroalimentación háptica centralizada. Nunca lanza: si el dispositivo no
 * soporta vibración (o estamos en web) simplemente no hace nada.
 */
const enabled = Platform.OS === "ios" || Platform.OS === "android";

function safe(run: () => Promise<void>): void {
  if (!enabled) return;
  run().catch(() => undefined);
}

export const haptic = {
  /** Toque ligero: botones, chips, tarjetas. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Cambio de selección: pickers, segmentos, switches. */
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
