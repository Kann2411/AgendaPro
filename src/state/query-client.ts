import { QueryClient } from "@tanstack/react-query";
import { syncReminders } from "@/services/reminders";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Invalida todas las vistas que dependen de datos locales. */
export function invalidateAll(): Promise<void> {
  // Cualquier cambio puede mover/cancelar citas: reprograma los recordatorios.
  void syncReminders().catch(() => undefined);
  return queryClient.invalidateQueries();
}
