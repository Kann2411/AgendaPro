import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getBusiness } from "@/data/repositories/business-repository";
import { listEmployees, listServices } from "@/data/repositories/catalog-repository";
import { getClientProfile, listClients } from "@/data/repositories/clients-repository";
import { listAppointments } from "@/data/repositories/appointments-repository";
import {
  getDashboard,
  getFinanceReport,
  listExpenses,
  listIncomes,
  type FinanceFilters,
} from "@/data/repositories/finance-repository";
import { listNotifications } from "@/data/repositories/notifications-repository";
import { isoToday, timeNow } from "@/domain/time";
import { qk } from "./query-keys";

export function useNow() {
  const [now, setNow] = useState(() => ({ day: isoToday(), time: timeNow() }));
  useEffect(() => {
    const refresh = () => setNow({ day: isoToday(), time: timeNow() });
    refresh();
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return now;
}

export function useBusiness() {
  return useQuery({ queryKey: qk.business, queryFn: getBusiness, staleTime: 60_000 });
}

export function useServices() {
  return useQuery({ queryKey: qk.services, queryFn: listServices });
}

export function useEmployees() {
  return useQuery({ queryKey: qk.employees, queryFn: listEmployees });
}

export function useClients(q = "") {
  return useQuery({ queryKey: qk.clients(q), queryFn: () => listClients(q) });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: qk.client(id),
    queryFn: () => getClientProfile(id),
    enabled: !!id,
  });
}

export function useAppointments(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: qk.appointments(from, to),
    queryFn: () => listAppointments(from, to),
    enabled,
  });
}

/**
 * La hora actual se lee al ejecutar la consulta (no forma parte de la key)
 * para no crear una entrada de caché nueva cada minuto.
 */
const MINUTE = 60_000;

export function useDashboard(day: string, enabled = true) {
  return useQuery({
    queryKey: qk.dashboard(day),
    queryFn: () => getDashboard(day, timeNow()),
    refetchInterval: MINUTE,
    enabled,
  });
}

export function useFinance(filters: FinanceFilters, enabled = true) {
  return useQuery({
    queryKey: qk.finance(
      filters.from,
      filters.to,
      filters.service ?? "",
      filters.employeeId ?? "",
      filters.method ?? "",
    ),
    queryFn: () => getFinanceReport(filters),
    enabled,
  });
}

export function useIncomes(from: string, to: string) {
  return useQuery({
    queryKey: ["incomes", from, to] as const,
    queryFn: () => listIncomes(from, to),
  });
}

export function useExpenses(from: string, to: string) {
  return useQuery({
    queryKey: ["expenses", from, to] as const,
    queryFn: () => listExpenses(from, to),
  });
}

export function useNotifications(day: string) {
  return useQuery({
    queryKey: qk.notifications(day),
    queryFn: () => listNotifications(day, timeNow()),
    refetchInterval: MINUTE,
  });
}
