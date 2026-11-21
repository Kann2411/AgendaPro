import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/ui/theme";

const ICONS: Record<string, string> = {
  index: "view-dashboard-outline",
  agenda: "calendar-month-outline",
  clientes: "account-group-outline",
  finanzas: "chart-line",
  ajustes: "cog-outline",
};

const LABELS: Record<string, string> = {
  index: "Inicio",
  agenda: "Agenda",
  clientes: "Clientes",
  finanzas: "Finanzas",
  ajustes: "Ajustes",
};

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.faint,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={(ICONS[route.name] ?? "circle") as never}
            size={size ?? 22}
            color={typeof color === "string" ? color : theme.colors.faint}
          />
        ),
        title: LABELS[route.name] ?? route.name,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="clientes" />
      <Tabs.Screen name="finanzas" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}
