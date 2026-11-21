import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import {
  deleteAppointment,
  setAppointmentStatus,
} from "@/data/repositories/appointments-repository";
import { formatDay, formatTime, monthGrid, weekDays } from "@/domain/time";
import { errorText, methodLabel, money, statusLabel, statusTone } from "@/domain/format";
import { PAYMENT_METHODS, type Appointment } from "@/domain/types";
import { useAppointments, useBusiness, useEmployees, useNow } from "@/state/hooks";
import { usePreferences } from "@/state/preferences";
import { invalidateAll } from "@/state/query-client";
import { Badge, Button, Card, EmptyState, LoadingState, PageTitle, Row, Screen, SectionTitle, Segmented } from "@/ui/components";
import { SelectField } from "@/ui/forms";
import { useTheme } from "@/ui/theme";

type AgendaView = "day" | "week" | "month";

export default function AgendaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const now = useNow();
  const business = useBusiness().data;
  const employees = useEmployees().data ?? [];
  const { dayCursor, agendaView, employeeFilter, setDayCursor, setAgendaView, setEmployeeFilter } = usePreferences();
  const [payFor, setPayFor] = useState<Appointment | null>(null);
  const day = dayCursor ?? now.day;

  const range = useMemo(() => {
    if (agendaView === "week") {
      const week = weekDays(day);
      return { from: week[0]!, to: week[6]!, days: week };
    }
    if (agendaView === "month") {
      const grid = monthGrid(day);
      return { from: grid[0]!, to: grid[41]!, days: grid };
    }
    return { from: day, to: day, days: [day] };
  }, [agendaView, day]);

  const { data, isLoading, isRefetching, refetch } = useAppointments(range.from, range.to);
  const items = (data ?? []).filter((a) => !employeeFilter || a.employeeId === employeeFilter);
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const item of items) {
      const list = map.get(item.localDate) ?? [];
      list.push(item);
      map.set(item.localDate, list);
    }
    return map;
  }, [items]);

  const changeStatus = useMutation({
    mutationFn: ({ id, status, method }: { id: string; status: string; method?: string | null }) =>
      setAppointmentStatus(id, status, method ?? null),
    onSuccess: async () => {
      setPayFor(null);
      await invalidateAll();
    },
    onError: (error) => Alert.alert("No se pudo actualizar", errorText(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: async () => invalidateAll(),
    onError: (error) => Alert.alert("No se pudo eliminar", errorText(error)),
  });

  function confirmDelete(item: Appointment) {
    Alert.alert("Eliminar cita", `¿Eliminar la cita de ${item.clientName}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => remove.mutate(item.id) },
    ]);
  }

  function askPayment(item: Appointment) {
    const methods = business?.paymentMethods?.length ? business.paymentMethods : PAYMENT_METHODS.map((m) => m.id);
    Alert.alert(
      "Completar y cobrar",
      `${item.clientName} · ${money(item.priceCents, business?.currency, business?.locale)}\nElige el método de pago:`,
      [
        { text: "Cancelar", style: "cancel" },
        ...methods.map((method) => ({
          text: methodLabel(method),
          onPress: () => changeStatus.mutate({ id: item.id, status: "completed", method }),
        })),
      ],
    );
    setPayFor(item);
  }

  const visibleDays = agendaView === "day" ? [day] : agendaView === "week" ? range.days : range.days.filter((d) => d.slice(0, 7) === day.slice(0, 7));
  const selectedCount = byDay.get(day)?.length ?? 0;

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <PageTitle
        title="Agenda"
        subtitle={formatDay(day, "EEEE d 'de' MMMM")}
        action={<Button title="Nueva cita" icon="plus" onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: "new" } })} />}
      />

      <Segmented
        options={[
          { id: "day", label: "Día" },
          { id: "week", label: "Semana" },
          { id: "month", label: "Mes" },
        ]}
        value={agendaView}
        onChange={setAgendaView}
      />

      <Card style={styles.navCard}>
        <Row style={{ justifyContent: "space-between" }}>
          <Button title="Anterior" variant="ghost" icon="chevron-left" onPress={() => setDayCursor(shift(day, agendaView, -1))} />
          <Text style={[styles.navLabel, { color: theme.colors.text }]}>{formatDay(day, "MMM yyyy")}</Text>
          <Button title="Siguiente" variant="ghost" icon="chevron-right" onPress={() => setDayCursor(shift(day, agendaView, 1))} />
        </Row>
        <Button title="Hoy" variant="secondary" onPress={() => setDayCursor(now.day)} />
      </Card>

      <SelectField
        label="Filtrar por empleado"
        value={employeeFilter || null}
        options={[{ id: "", label: "Todos" }, ...employees.map((e) => ({ id: e.id, label: e.name }))]}
        onChange={setEmployeeFilter}
      />

      {agendaView !== "day" ? (
        <Card style={styles.calendarCard}>
          <View style={styles.calendarGrid}>
            {visibleDays.map((date) => {
              const count = byDay.get(date)?.length ?? 0;
              const active = date === day;
              return (
                <View
                  key={date}
                  style={[
                    styles.calendarCell,
                    active && { backgroundColor: theme.colors.primary },
                    !active && { backgroundColor: theme.colors.sunken },
                  ]}
                >
                  <Text
                    onPress={() => setDayCursor(date)}
                    style={[styles.calendarDay, { color: active ? theme.colors.primaryFg : theme.colors.text }]}
                  >
                    {Number(date.slice(8))}
                  </Text>
                  {count ? (
                    <View style={[styles.calendarDot, { backgroundColor: active ? theme.colors.primaryFg : theme.colors.secondary }]} />
                  ) : null}
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      <SectionTitle>{formatDay(day, "d MMM")} · {selectedCount} citas</SectionTitle>
      {isLoading ? <LoadingState /> : null}
      {!isLoading && !visibleDays.some((d) => (byDay.get(d)?.length ?? 0) > 0) ? (
        <EmptyState
          title="Sin citas en este periodo"
          body="Crea una cita para empezar a organizar tu día."
          action={<Button title="Agendar cita" onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: "new" } })} />}
        />
      ) : null}

      {visibleDays.map((date) => {
        const list = byDay.get(date) ?? [];
        if (!list.length) return null;
        return (
          <View key={date} style={styles.dayGroup}>
            {agendaView !== "day" ? (
              <Text style={[styles.dayLabel, { color: theme.colors.muted }]}>{formatDay(date, "EEE d MMM")}</Text>
            ) : null}
            {list.map((item) => (
              <Card key={item.id} style={styles.apptCard}>
                <Row style={{ alignItems: "flex-start" }}>
                  <View style={[styles.timeBlock, { backgroundColor: theme.colors.sunken }]}>
                    <Text style={[styles.timeText, { color: theme.colors.primary }]}>{formatTime(item.localTime)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={[styles.clientName, { color: theme.colors.text }]}
                      onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: item.id } })}
                    >
                      {item.clientName}
                    </Text>
                    <Text style={[styles.detail, { color: theme.colors.muted }]}>
                      {item.serviceName}{item.petName ? ` · ${item.petName}` : ""}
                    </Text>
                    <Text style={[styles.detail, { color: theme.colors.muted }]}>
                      {item.employeeName || "Sin asignar"} · {money(item.priceCents, business?.currency, business?.locale)}
                    </Text>
                    <Badge label={statusLabel(item.status)} tone={statusTone(item.status)} />
                  </View>
                </Row>
                <View style={styles.actions}>
                  {item.status === "completed" ? (
                    <Badge label={methodLabel(item.paymentMethod ?? "")} tone="neutral" />
                  ) : (
                    <Button title="Completar" variant="secondary" icon="check" onPress={() => askPayment(item)} />
                  )}
                  {item.status !== "cancelled" && item.status !== "completed" ? (
                    <Button
                      title="Cancelar"
                      variant="ghost"
                      icon="close"
                      onPress={() => changeStatus.mutate({ id: item.id, status: "cancelled" })}
                    />
                  ) : null}
                  <Button title="Eliminar" variant="ghost" icon="delete-outline" onPress={() => confirmDelete(item)} />
                </View>
              </Card>
            ))}
          </View>
        );
      })}
      {payFor ? <View style={{ height: 1 }} /> : null}
    </Screen>
  );
}

function shift(day: string, view: AgendaView, direction: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  if (view === "day") dt.setUTCDate(dt.getUTCDate() + direction);
  else if (view === "week") dt.setUTCDate(dt.getUTCDate() + direction * 7);
  else dt.setUTCMonth(dt.getUTCMonth() + direction);
  return dt.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  navCard: { gap: 8, marginBottom: 12 },
  navLabel: { fontSize: 15, fontWeight: "700" },
  calendarCard: { padding: 10 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  calendarCell: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", gap: 2 },
  calendarDay: { fontSize: 14, fontWeight: "700" },
  calendarDot: { width: 4, height: 4, borderRadius: 2 },
  dayGroup: { gap: 8, marginBottom: 12 },
  dayLabel: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  apptCard: { gap: 10 },
  timeBlock: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9 },
  timeText: { fontSize: 11, fontWeight: "700" },
  clientName: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
