import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isoToday } from "@/domain/time";

type AgendaView = "day" | "week" | "month";

type Preferences = {
  dayCursor: string | null;
  agendaView: AgendaView;
  employeeFilter: string;
  financeFrom: string | null;
  financeTo: string | null;
  setDayCursor: (day: string | null) => void;
  setAgendaView: (view: AgendaView) => void;
  setEmployeeFilter: (id: string) => void;
  setFinanceRange: (from: string, to: string) => void;
};

const kvStorage = {
  getItem: (name: string) => Storage.getItemSync(name),
  setItem: (name: string, value: string) => Storage.setItemSync(name, value),
  removeItem: (name: string) => Storage.removeItemSync(name),
};

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      dayCursor: null,
      agendaView: "day",
      employeeFilter: "",
      financeFrom: null,
      financeTo: null,
      setDayCursor: (dayCursor) => set({ dayCursor }),
      setAgendaView: (agendaView) => set({ agendaView }),
      setEmployeeFilter: (employeeFilter) => set({ employeeFilter }),
      setFinanceRange: (financeFrom, financeTo) => set({ financeFrom, financeTo }),
    }),
    {
      name: "agendapro.preferences",
      storage: createJSONStorage(() => kvStorage),
      partialize: (state) => ({
        dayCursor: state.dayCursor,
        agendaView: state.agendaView,
        employeeFilter: state.employeeFilter,
        financeFrom: state.financeFrom,
        financeTo: state.financeTo,
      }),
    },
  ),
);

export function currentDay(cursor: string | null): string {
  return cursor ?? isoToday();
}
