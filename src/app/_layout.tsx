import { useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getDb } from "@/data/db/database";
import { queryClient } from "@/state/query-client";
import { useBusiness } from "@/state/hooks";
import { ThemeContext, themeFromBusiness, useTheme } from "@/ui/theme";

function Providers({ children }: { children: React.ReactNode }) {
  const { data: business } = useBusiness();
  const system = useColorScheme();
  const theme = useMemo(() => themeFromBusiness(business, system), [business, system]);

  useEffect(() => {
    void getDb();
  }, []);

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
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Atrás",
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ title: "Configura tu negocio", headerBackVisible: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appointment/[id]" options={{ title: "Cita" }} />
      <Stack.Screen name="client/[id]" options={{ title: "Cliente" }} />
      <Stack.Screen name="notifications" options={{ title: "Notificaciones" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Providers>
          <ThemedStack />
        </Providers>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
