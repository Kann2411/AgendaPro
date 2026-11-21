import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatLongDay, formatTime } from "@/domain/time";
import { money, statusLabel, statusTone } from "@/domain/format";
import { useBusiness, useDashboard, useNow } from "@/state/hooks";
import { Badge, Button, Card, EmptyState, LoadingState, PageTitle, Row, Screen, SectionTitle, Stat } from "@/ui/components";
import { useQuickActions } from "@/features/quick-actions";
import { Fab } from "@/ui/Fab";
import { useTheme } from "@/ui/theme";

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const quickActions = useQuickActions();
  const now = useNow();
  const { data: business } = useBusiness();
  const { data: dashboard, isLoading, refetch, isRefetching } = useDashboard(now.day);

  if (isLoading || !dashboard) return <Screen><LoadingState /></Screen>;

  const maxSeries = Math.max(1, ...dashboard.series.map((s) => s.revenue));
  const firstName = (business?.name ?? "tu negocio").split(" ")[0];

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()} overlay={<Fab actions={quickActions} />}>
      <PageTitle
        title={`Hola, ${firstName}`}
        subtitle={formatLongDay(dashboard.day)}
        action={
          <Row>
            <Button
              title="Avisos"
              variant="secondary"
              icon="bell-outline"
              onPress={() => router.push("/notifications")}
            />
          </Row>
        }
      />

      <View style={styles.statsGrid}>
        <Stat label="Citas hoy" value={String(dashboard.scheduled)} tone={theme.colors.primary} />
        <Stat label="Completadas" value={String(dashboard.completed)} tone={theme.colors.success} />
        <Stat label="Pendientes" value={String(dashboard.pending)} tone={theme.colors.warning} />
        <Stat label="Canceladas" value={String(dashboard.cancelled + dashboard.noShow)} tone={theme.colors.danger} />
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Ingresos del día" value={money(dashboard.dayRevenue, business?.currency, business?.locale)} />
        <Stat label="Ingresos del mes" value={money(dashboard.monthRevenue, business?.currency, business?.locale)} />
      </View>

      <SectionTitle>Próximas citas</SectionTitle>
      {dashboard.upcoming.length ? (
        dashboard.upcoming.map((item) => (
          <Card key={item.id} style={styles.apptCard} onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: item.id } })}>
            <Row style={{ alignItems: "flex-start" }}>
              <View style={[styles.timeBlock, { backgroundColor: theme.colors.sunken }]}>
                <Text style={[styles.timeText, { color: theme.colors.primary }]}>{formatTime(item.localTime)}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.apptName, { color: theme.colors.text }]}>{item.clientName}</Text>
                <Text style={[styles.apptDetail, { color: theme.colors.muted }]}>
                  {item.serviceName}{item.petName ? ` · ${item.petName}` : ""}
                </Text>
                <Badge label={statusLabel(item.status)} tone={statusTone(item.status)} />
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.faint} />
            </Row>
          </Card>
        ))
      ) : (
        <EmptyState
          title="Todo al día"
          body="No hay citas próximas por ahora."
          action={<Button title="Agendar cita" onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: "new" } })} />}
        />
      )}

      <SectionTitle>Ingresos de los últimos 7 días</SectionTitle>
      <Card style={styles.chartCard}>
        <View style={styles.chart}>
          {dashboard.series.map((point) => (
            <View key={point.day} style={styles.chartColumn}>
              <View style={[styles.chartTrack, { backgroundColor: theme.colors.sunken }]}>
                <View
                  style={[
                    styles.chartBar,
                    { height: `${Math.max(4, (point.revenue / maxSeries) * 100)}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
              <Text style={[styles.chartLabel, { color: theme.colors.faint }]}>{point.day.slice(8)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Stat label="Tasa de conclusión" value={`${dashboard.completionRate}%`} />
        <Stat label="Clientes atendidos" value={String(dashboard.clientsSeen)} />
      </View>

      {dashboard.topService ? (
        <Card style={styles.highlight}>
          <MaterialCommunityIcons name="star-outline" size={22} color={theme.colors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.highlightTitle, { color: theme.colors.text }]}>Servicio destacado</Text>
            <Text style={[styles.apptDetail, { color: theme.colors.muted }]}>
              {dashboard.topService.name} · {dashboard.topService.count} citas este mes
            </Text>
          </View>
        </Card>
      ) : null}

      {dashboard.teamToday.length ? (
        <>
          <SectionTitle>Equipo de hoy</SectionTitle>
          <Card>
            {dashboard.teamToday.map((member) => (
              <Row key={member.name} style={styles.teamRow}>
                <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.muted} />
                <Text style={{ color: theme.colors.text, flex: 1 }}>{member.name}</Text>
                <Badge label={`${member.count} citas`} tone="primary" />
              </Row>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  apptCard: { marginBottom: 8 },
  timeBlock: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  timeText: { fontSize: 12, fontWeight: "700" },
  apptName: { fontSize: 15, fontWeight: "700" },
  apptDetail: { fontSize: 12 },
  chartCard: { paddingVertical: 14 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 110 },
  chartColumn: { flex: 1, alignItems: "center", gap: 4 },
  chartTrack: { width: "100%", height: 85, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  chartBar: { width: "100%", borderRadius: 6 },
  chartLabel: { fontSize: 10 },
  highlight: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  highlightTitle: { fontSize: 14, fontWeight: "700" },
  teamRow: { paddingVertical: 6 },
});
