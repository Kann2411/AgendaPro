import { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDb } from "@/data/db/database";
import { configureNotifications, requestReminderPermission, syncReminders, useNotificationNavigation } from "@/services/reminders";
import { usePreferences } from "@/state/preferences";
import { queryClient } from "@/state/query-client";
import { useBusiness } from "@/state/hooks";
import { ThemeContext, themeFromBusiness, useTheme } from "@/ui/theme";

configureNotifications();

function Providers({ children }: { children: React.ReactNode }) {
  const { data: business } = useBusiness();
  const system = useColorScheme();
  const theme = useMemo(() => themeFromBusiness(business, system), [business, system]);

  useEffect(() => {
    void getDb();
  }, []);

  // Con el negocio configurado: pide permiso de notificaciones (una vez) y
  // reprograma recordatorios cuando cambian las preferencias.
  const hasBusiness = !!business;
  const { remindersEnabled, reminderMinutes, dailySummary } = usePreferences();
  useEffect(() => {
    if (!hasBusiness) return;
    void (async () => {
      if (remindersEnabled || dailySummary) await requestReminderPermission().catch(() => false);
      await syncReminders().catch(() => 0);
    })();
  }, [hasBusiness, remindersEnabled, reminderMinutes, dailySummary]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

function ThemedStack() {
  const theme = useTheme();
  useNotificationNavigation();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Atrás",
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ title: "Configura tu negocio", headerBackVisible: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appointment/[id]" options={{ title: "Cita", animation: "slide_from_bottom" }} />
      <Stack.Screen name="client/[id]" options={{ title: "Cliente" }} />
      <Stack.Screen name="notifications" options={{ title: "Notificaciones" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Providers>
            <ThemedStack />
          </Providers>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
