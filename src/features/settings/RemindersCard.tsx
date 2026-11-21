import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDuration } from "@/domain/format";
import {
  reminderPermission,
  requestReminderPermission,
  syncReminders,
  type ReminderPermission,
} from "@/services/reminders";
import { usePreferences } from "@/state/preferences";
import { Badge, Button, Card, Field, Row } from "@/ui/components";
import { ToggleRow } from "@/ui/forms";
import { ChipGroup } from "@/ui/pickers";
import { useTheme } from "@/ui/theme";

const LEAD_OPTIONS = [15, 30, 60, 120, 1440].map((m) => ({
  id: String(m),
  label: m === 1440 ? "1 día antes" : formatDuration(m),
}));

/** Ajustes de recordatorios: permiso del sistema, anticipación y resumen diario. */
export function RemindersCard() {
  const theme = useTheme();
  const { remindersEnabled, reminderMinutes, dailySummary, setReminders } = usePreferences();
  const [permission, setPermission] = useState<ReminderPermission>("undetermined");

  const refresh = useCallback(() => {
    void reminderPermission().then(setPermission).catch(() => undefined);
  }, []);

  // Al volver de los ajustes del sistema, refresca el estado del permiso.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refresh();
        void syncReminders().catch(() => 0);
      }
    });
    return () => sub.remove();
  }, [refresh]);

  async function allow() {
    if (permission === "denied") {
      await Linking.openSettings();
      return;
    }
    await requestReminderPermission();
    refresh();
    await syncReminders().catch(() => 0);
  }

  return (
    <Card>
      <Row style={styles.row}>
        <MaterialCommunityIcons name="bell-ring-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Notificaciones del sistema</Text>
        <Badge
          label={permission === "granted" ? "Permitidas" : permission === "denied" ? "Bloqueadas" : "Sin permiso"}
          tone={permission === "granted" ? "success" : "danger"}
        />
      </Row>
      {permission !== "granted" ? (
        <>
          <Text style={[styles.note, { color: theme.colors.muted }]}>
            {permission === "denied"
              ? "Las notificaciones están bloqueadas. Actívalas en los ajustes del celular para recibir recordatorios."
              : "Permite las notificaciones para recibir avisos antes de cada cita."}
          </Text>
          <Button
            title={permission === "denied" ? "Abrir ajustes del celular" : "Permitir notificaciones"}
            icon="bell-check-outline"
            onPress={() => void allow()}
          />
        </>
      ) : null}

      <ToggleRow
        label="Recordatorio de cada cita"
        hint="Aviso en el celular antes de que empiece la cita."
        value={remindersEnabled}
        onChange={(v) => setReminders({ remindersEnabled: v })}
      />
      {remindersEnabled ? (
        <Field label="Avisarme">
          <ChipGroup
            value={String(reminderMinutes)}
            options={LEAD_OPTIONS}
            onChange={(v) => setReminders({ reminderMinutes: Number(v) })}
          />
        </Field>
      ) : null}
      <ToggleRow
        label="Resumen al abrir el negocio"
        hint="Un aviso diario 15 minutos antes de tu horario de apertura."
        value={dailySummary}
        onChange={(v) => setReminders({ dailySummary: v })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: "600" },
  note: { fontSize: 12, lineHeight: 18 },
});
