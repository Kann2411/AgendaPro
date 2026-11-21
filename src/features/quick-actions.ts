import { useMemo } from "react";
import { useRouter } from "expo-router";
import type { FabAction } from "@/ui/Fab";

/** Acciones del botón flotante: crear cita, cliente o gasto desde cualquier pestaña. */
export function useQuickActions(): FabAction[] {
  const router = useRouter();
  return useMemo(
    () => [
      {
        id: "expense",
        label: "Registrar gasto",
        icon: "cash-minus",
        onPress: () => router.push({ pathname: "/(tabs)/finanzas", params: { gasto: "1" } }),
      },
      {
        id: "client",
        label: "Nuevo cliente",
        icon: "account-plus-outline",
        onPress: () => router.push({ pathname: "/client/[id]", params: { id: "new" } }),
      },
      {
        id: "appointment",
        label: "Nueva cita",
        icon: "calendar-plus",
        onPress: () => router.push({ pathname: "/appointment/[id]", params: { id: "new" } }),
      },
    ],
    [router],
  );
}
