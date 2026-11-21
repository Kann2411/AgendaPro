export const qk = {
  business: ["business"] as const,
  services: ["services"] as const,
  employees: ["employees"] as const,
  clients: (q: string) => ["clients", q] as const,
  client: (id: string) => ["client", id] as const,
  appointments: (from: string, to: string) => ["appointments", from, to] as const,
  dashboard: (day: string) => ["dashboard", day] as const,
  finance: (from: string, to: string, service: string, employeeId: string, method: string) =>
    ["finance", from, to, service, employeeId, method] as const,
  notifications: (day: string) => ["notifications", day] as const,
  pendingChanges: ["pending-changes"] as const,
};
