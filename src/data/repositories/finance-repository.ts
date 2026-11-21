import { getDb, type Db } from "../db/database";
import { enqueueOutbox } from "../db/outbox";
import { mapAppointment, mapExpense, mapIncome } from "../mappers";
import type {
  Appointment,
  DashboardData,
  Expense,
  FinanceReport,
  Income,
} from "@/domain/types";
import { addDays, addMonths, eachDay, monthEnd, monthStart } from "@/domain/time";
import { clip, num, reqDay } from "@/domain/validation";
import { newId } from "@/utils/id";
import { getBusiness } from "./business-repository";

async function queryAppointments(db: Db, from: string, to: string): Promise<Appointment[]> {
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM appointments
    WHERE deleted_at IS NULL AND local_date >= ${from} AND local_date <= ${to}
    ORDER BY local_date, local_time
    LIMIT 20000
  `;
  return rows.map(mapAppointment);
}

async function queryIncomes(db: Db, from: string, to: string): Promise<Income[]> {
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM incomes
    WHERE deleted_at IS NULL AND occurred_on >= ${from} AND occurred_on <= ${to}
    ORDER BY occurred_on DESC
    LIMIT 20000
  `;
  return rows.map(mapIncome);
}

async function queryExpenses(db: Db, from: string, to: string): Promise<Expense[]> {
  const rows = await db.sql<Record<string, unknown>>`
    SELECT * FROM expenses
    WHERE deleted_at IS NULL AND occurred_on >= ${from} AND occurred_on <= ${to}
    ORDER BY occurred_on DESC
    LIMIT 20000
  `;
  return rows.map(mapExpense);
}

type IncomeForAppointment = {
  id: string;
  priceCents: number;
  method: string;
  serviceName: string;
  employeeId: string | null;
  employeeName: string;
  localDate: string;
};

export async function recordIncomeForAppointment(
  db: Db,
  appt: IncomeForAppointment,
): Promise<void> {
  const id = newId("i_");
  const now = new Date().toISOString();
  await db.sql`
    INSERT INTO incomes (
      id, appointment_id, amount_cents, method, service_name, employee_id, employee_name,
      note, occurred_on, updated_at
    ) VALUES (
      ${id}, ${appt.id}, ${appt.priceCents}, ${appt.method}, ${appt.serviceName},
      ${appt.employeeId}, ${appt.employeeName}, '', ${appt.localDate}, ${now}
    )
    ON CONFLICT(appointment_id) DO UPDATE SET
      amount_cents = excluded.amount_cents, method = excluded.method,
      service_name = excluded.service_name, employee_id = excluded.employee_id,
      employee_name = excluded.employee_name, occurred_on = excluded.occurred_on,
      updated_at = excluded.updated_at, deleted_at = NULL
  `;
  await enqueueOutbox(db, "income", appt.id, "insert", { amountCents: appt.priceCents });
}

export async function clearIncomeForAppointment(db: Db, appointmentId: string): Promise<void> {
  await db.sql`DELETE FROM incomes WHERE appointment_id = ${appointmentId}`;
}

export async function listIncomes(from: string, to: string): Promise<Income[]> {
  return queryIncomes(await getDb(), reqDay(from, "Desde"), reqDay(to, "Hasta"));
}

export async function listExpenses(from: string, to: string): Promise<Expense[]> {
  return queryExpenses(await getDb(), reqDay(from, "Desde"), reqDay(to, "Hasta"));
}

export async function saveExpense(input: {
  id?: string;
  category: string;
  description?: string;
  amountCents: number;
  occurredOn: string;
}): Promise<Expense> {
  const db = await getDb();
  const category = clip(input.category, 60);
  if (!category) throw new Error("Escribe la categoría");
  const amountCents = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 100_000_000) {
    throw new Error("El monto no es válido");
  }
  const occurredOn = reqDay(input.occurredOn, "La fecha");
  const id = input.id ?? newId("x_");
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`
      INSERT INTO expenses (id, category, description, amount_cents, occurred_on, updated_at)
      VALUES (${id}, ${category}, ${clip(input.description, 500)}, ${amountCents}, ${occurredOn}, ${now})
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category, description = excluded.description,
        amount_cents = excluded.amount_cents, occurred_on = excluded.occurred_on,
        updated_at = excluded.updated_at, deleted_at = NULL
    `;
    await enqueueOutbox(db, "expense", id, input.id ? "update" : "insert", { amountCents });
  });
  const rows = await db.sql<Record<string, unknown>>`SELECT * FROM expenses WHERE id = ${id}`;
  return mapExpense(rows[0]!);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.sql`UPDATE expenses SET deleted_at = ${now}, updated_at = ${now} WHERE id = ${id}`;
    await enqueueOutbox(db, "expense", id, "delete");
  });
}

export async function getDashboard(day: string, nowTime: string): Promise<DashboardData | null> {
  const db = await getDb();
  const business = await getBusiness();
  if (!business) return null;
  const from = addDays(day, -6);
  const mFrom = monthStart(day);
  const mTo = monthEnd(day);

  const [today, monthAppts, seriesAppts, incomes, expenses, upcomingRows] = await Promise.all([
    queryAppointments(db, day, day),
    queryAppointments(db, mFrom, mTo),
    queryAppointments(db, from, day),
    queryIncomes(db, mFrom, mTo),
    queryExpenses(db, mFrom, mTo),
    db.sql<Record<string, unknown>>`
      SELECT * FROM appointments
      WHERE deleted_at IS NULL AND status IN ('pending', 'confirmed', 'in_progress')
        AND (local_date > ${day} OR (local_date = ${day} AND local_time >= ${nowTime}))
      ORDER BY local_date, local_time LIMIT 6
    `,
  ]);

  const active = today.filter((a) => a.status !== "cancelled");
  const completed = today.filter((a) => a.status === "completed");
  const pending = today.filter((a) => a.status === "pending" || a.status === "confirmed" || a.status === "in_progress");
  const cancelled = today.filter((a) => a.status === "cancelled");
  const noShow = today.filter((a) => a.status === "no_show");
  const seen = new Set(completed.map((a) => a.clientId ?? a.clientName));

  const incomeByDay = new Map<string, number>();
  for (const i of incomes) incomeByDay.set(i.occurredOn, (incomeByDay.get(i.occurredOn) ?? 0) + i.amountCents);
  const countByDay = new Map<string, number>();
  for (const a of seriesAppts) {
    if (a.status === "cancelled") continue;
    countByDay.set(a.localDate, (countByDay.get(a.localDate) ?? 0) + 1);
  }
  const series = eachDay(from, day).map((d) => ({
    day: d,
    revenue: incomeByDay.get(d) ?? 0,
    count: countByDay.get(d) ?? 0,
  }));

  const serviceCounts = new Map<string, number>();
  for (const a of monthAppts) {
    if (a.status !== "completed") continue;
    serviceCounts.set(a.serviceName, (serviceCounts.get(a.serviceName) ?? 0) + 1);
  }
  const topEntry = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const monthDone = monthAppts.filter((a) => ["completed", "cancelled", "no_show"].includes(a.status));
  const done = monthAppts.filter((a) => a.status === "completed").length;

  const teamMap = new Map<string, number>();
  for (const a of active) {
    const name = a.employeeName || "Sin asignar";
    teamMap.set(name, (teamMap.get(name) ?? 0) + 1);
  }

  return {
    day,
    scheduled: active.length,
    completed: completed.length,
    pending: pending.length,
    cancelled: cancelled.length,
    noShow: noShow.length,
    clientsSeen: seen.size,
    dayRevenue: incomeByDay.get(day) ?? 0,
    monthRevenue: incomes.reduce((s, i) => s + i.amountCents, 0),
    monthExpense: expenses.reduce((s, e) => s + e.amountCents, 0),
    completionRate: monthDone.length ? Math.round((done / monthDone.length) * 100) : 0,
    upcoming: upcomingRows.map(mapAppointment),
    todayList: today,
    series,
    topService: topEntry ? { name: topEntry[0], count: topEntry[1] } : null,
    teamToday: [...teamMap.entries()].map(([name, count]) => ({ name, count })),
  };
}

export type FinanceFilters = {
  from: string;
  to: string;
  service?: string;
  employeeId?: string;
  method?: string;
};

export async function getFinanceReport(input: FinanceFilters): Promise<FinanceReport | null> {
  const db = await getDb();
  const business = await getBusiness();
  if (!business) return null;
  const from = reqDay(input.from, "Desde");
  const to = reqDay(input.to, "Hasta");
  const service = clip(input.service, 120);
  const employeeId = clip(input.employeeId, 80);
  const method = clip(input.method, 20);

  const [allIncomes, allExpenses, appts, clients] = await Promise.all([
    queryIncomes(db, from, to),
    queryExpenses(db, from, to),
    queryAppointments(db, from, to),
    db.sql<Record<string, unknown>>`SELECT id, created_at FROM clients WHERE deleted_at IS NULL`,
  ]);

  const incomes = allIncomes.filter(
    (i) =>
      (!service || i.serviceName.toLowerCase().includes(service.toLowerCase())) &&
      (!employeeId || i.employeeId === employeeId) &&
      (!method || i.method === method),
  );
  const grossCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  const expenseCents = allExpenses.reduce((s, e) => s + e.amountCents, 0);

  function group<T>(items: T[], key: (item: T) => string): { name: string; count: number; cents: number }[] {
    const map = new Map<string, { count: number; cents: number }>();
    for (const item of items) {
      const k = key(item);
      const current = map.get(k) ?? { count: 0, cents: 0 };
      current.count += 1;
      current.cents += num((item as Income).amountCents);
      map.set(k, current);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, count: v.count, cents: v.cents }))
      .sort((a, b) => b.cents - a.cents);
  }

  const incomeByDay = new Map<string, number>();
  for (const i of incomes) incomeByDay.set(i.occurredOn, (incomeByDay.get(i.occurredOn) ?? 0) + i.amountCents);
  const expenseByDay = new Map<string, number>();
  for (const e of allExpenses) expenseByDay.set(e.occurredOn, (expenseByDay.get(e.occurredOn) ?? 0) + e.amountCents);
  const days = eachDay(from, to).slice(-90);
  const series = days.map((d) => ({
    day: d,
    income: incomeByDay.get(d) ?? 0,
    expense: expenseByDay.get(d) ?? 0,
  }));

  const monthsMap = new Map<string, { income: number; expense: number }>();
  for (const i of incomes) {
    const key = i.occurredOn.slice(0, 7);
    const v = monthsMap.get(key) ?? { income: 0, expense: 0 };
    v.income += i.amountCents;
    monthsMap.set(key, v);
  }
  for (const e of allExpenses) {
    const key = e.occurredOn.slice(0, 7);
    const v = monthsMap.get(key) ?? { income: 0, expense: 0 };
    v.expense += e.amountCents;
    monthsMap.set(key, v);
  }

  const visitsByClient = new Map<string, number>();
  for (const a of appts) {
    if (!a.clientId || a.status !== "completed") continue;
    visitsByClient.set(a.clientId, (visitsByClient.get(a.clientId) ?? 0) + 1);
  }
  const newClients = clients.filter((c) => {
    const created = String((c as Record<string, unknown>).created_at ?? "").slice(0, 10);
    return created >= from && created <= to;
  }).length;

  return {
    from,
    to,
    grossCents,
    expenseCents,
    netCents: grossCents - expenseCents,
    incomes,
    expenses: allExpenses,
    incomesTruncated: incomes.length >= 20_000,
    byService: group(incomes, (i) => i.serviceName || "Sin servicio"),
    byEmployee: group(incomes, (i) => i.employeeName || "Sin asignar"),
    byMethod: group(incomes, (i) => i.method).map(({ name, cents }) => ({ method: name, cents })),
    topDays: [...incomeByDay.entries()]
      .map(([day, cents]) => ({ day, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 5),
    series,
    months: [...monthsMap.entries()].map(([month, v]) => ({ month, ...v })),
    newClients,
    returningClients: [...visitsByClient.values()].filter((n) => n > 1).length,
  };
}

export async function monthRange(day: string): Promise<{ from: string; to: string; previousFrom: string; previousTo: string }> {
  const from = monthStart(day);
  const to = monthEnd(day);
  const prev = addMonths(from, -1);
  return { from, to, previousFrom: monthStart(prev), previousTo: monthEnd(prev) };
}
