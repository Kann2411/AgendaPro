import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { markNotificationRead } from "@/data/repositories/notifications-repository";
import { useNotifications, useNow } from "@/state/hooks";
import { invalidateAll } from "@/state/query-client";
import { Badge, Card, EmptyState, LoadingState, Row, Screen, SectionTitle } from "@/ui/components";
import { useTheme } from "@/ui/theme";

export default function NotificationsScreen() {
  const theme = useTheme();
  const now = useNow();
  const { data, isLoading, isRefetching, refetch } = useNotifications(now.day);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <SectionTitle>Actividad reciente</SectionTitle>
      {isLoading ? <LoadingState /> : null}
      {!isLoading && !data?.length ? <EmptyState title="Sin notificaciones" body="Aquí verás recordatorios y novedades de tu agenda." /> : null}
      {data?.map((item) => (
        <Card
          key={item.id}
          style={[styles.card, !item.isRead && { borderColor: theme.colors.primary }]}
          onPress={async () => {
            if (!item.isRead) {
              await markNotificationRead(item.id);
              await invalidateAll();
            }
          }}
        >
          <Row style={{ alignItems: "flex-start" }}>
            <View style={[styles.icon, { backgroundColor: theme.colors.sunken }]}>
              <MaterialCommunityIcons
                name={item.kind === "reminder" ? "bell-ring-outline" : item.kind === "cancel" ? "calendar-remove-outline" : "information-outline"}
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                {!item.isRead ? <Badge label="Nuevo" tone="primary" /> : null}
              </Row>
              <Text style={[styles.body, { color: theme.colors.muted }]}>{item.body}</Text>
              <Text style={[styles.time, { color: theme.colors.faint }]}>{item.createdAt}</Text>
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700" },
  body: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 11 },
});
