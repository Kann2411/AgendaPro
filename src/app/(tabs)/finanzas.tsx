import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { saveExpense } from "@/data/repositories/finance-repository";
import { errorText, methodLabel, money, pesosToCents } from "@/domain/format";
import { isoToday, monthStart, monthEnd } from "@/domain/time";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/domain/types";
import { useBusiness, useEmployees, useFinance } from "@/state/hooks";
import { usePreferences } from "@/state/preferences";
import { invalidateAll } from "@/state/query-client";
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, PageTitle, Row, Screen, SectionTitle, Sheet, Stat } from "@/ui/components";
import { SelectField } from "@/ui/forms";
import { DateInput } from "@/ui/pickers";
import { useTheme } from "@/ui/theme";

const categoryOptions = EXPENSE_CATEGORIES.map((c) => ({ id: c, label: c }));

export default function FinanceScreen() {
  const theme = useTheme();
  const business = useBusiness().data;
  const employees = useEmployees().data ?? [];
  const { financeFrom, financeTo, setFinanceRange } = usePreferences();
  const [service, setService] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [method, setMethod] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>(EXPENSE_CATEGORIES[0]);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(isoToday());

  const from = financeFrom ?? monthStart(isoToday());
  const to = financeTo ?? monthEnd(isoToday());
  const { data: report, isLoading, isRefetching, refetch } = useFinance({ from, to, service, employeeId, method });

  const addExpense = useMutation({
    mutationFn: () => {
      const amountCents = pesosToCents(expenseAmount);
      if (amountCents == null) throw new Error("El monto no es válido");
      return saveExpense({ category: expenseCategory, description: expenseDescription, amountCents, occurredOn: expenseDate });
    },
    onSuccess: async () => {
      await invalidateAll();
      setExpenseOpen(false);
      setExpenseAmount("");
      setExpenseDescription("");
    },
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  const currency = business?.currency;
  const locale = business?.locale;
  const maxMethod = Math.max(1, ...(report?.byMethod.map((m) => m.cents) ?? [1]));

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <PageTitle
        title="Finanzas"
        subtitle={`${from} al ${to}`}
        action={<Button title="Gasto" icon="plus" variant="secondary" onPress={() => setExpenseOpen(true)} />}
      />

      <Card style={styles.filters}>
        <View style={styles.twoColumns}>
          <DateInput label="Desde" value={from} onChange={(v) => setFinanceRange(v, to)} />
          <DateInput label="Hasta" value={to} onChange={(v) => setFinanceRange(from, v)} />
        </View>
        <Field label="Servicio">
          <Input value={service} onChangeText={setService} placeholder="Filtrar por servicio" icon="magnify" />
        </Field>
        <SelectField
          label="Empleado"
          value={employeeId || null}
          options={[{ id: "", label: "Todos" }, ...employees.map((e) => ({ id: e.id, label: e.name }))]}
          onChange={setEmployeeId}
        />
        <SelectField
          label="Método de pago"
          value={method || null}
          options={[{ id: "", label: "Todos" }, ...PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))]}
          onChange={setMethod}
        />
      </Card>

      {isLoading ? <LoadingState /> : null}
      {!isLoading && !report ? <EmptyState title="Configura tu negocio" body="Las finanzas estarán disponibles después de la configuración inicial." /> : null}
      {report ? (
        <>
          <View style={styles.statsGrid}>
            <Stat label="Ingresos" value={money(report.grossCents, currency, locale)} tone={theme.colors.success} />
            <Stat label="Gastos" value={money(report.expenseCents, currency, locale)} tone={theme.colors.danger} />
          </View>
          <View style={styles.statsGrid}>
            <Stat label="Neto" value={money(report.netCents, currency, locale)} tone={theme.colors.primary} />
            <Stat label="Clientes nuevos" value={String(report.newClients)} />
          </View>

          <SectionTitle>Ingresos por método</SectionTitle>
          <Card style={{ gap: 10 }}>
            {report.byMethod.length ? (
              report.byMethod.map((item) => (
                <View key={item.method}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text style={{ color: theme.colors.text }}>{methodLabel(item.method)}</Text>
                    <Text style={{ color: theme.colors.muted }}>{money(item.cents, currency, locale)}</Text>
                  </Row>
                  <View style={[styles.barTrack, { backgroundColor: theme.colors.sunken }]}>
                    <View style={[styles.bar, { width: `${(item.cents / maxMethod) * 100}%`, backgroundColor: theme.colors.primary }]} />
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.colors.muted }}>Sin ingresos en este periodo.</Text>
            )}
          </Card>

          <SectionTitle>Mejores días</SectionTitle>
          <Card>
            {report.topDays.length ? (
              report.topDays.map((day) => (
                <Row key={day.day} style={styles.row}>
                  <Text style={{ color: theme.colors.text, flex: 1 }}>{day.day}</Text>
                  <Badge label={money(day.cents, currency, locale)} tone="success" />
                </Row>
              ))
            ) : (
              <Text style={{ color: theme.colors.muted }}>Sin datos.</Text>
            )}
          </Card>

          <SectionTitle>Gastos del periodo</SectionTitle>
          {report.expenses.length ? (
            report.expenses.map((expense) => (
              <Card key={expense.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{expense.category}</Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
                      {expense.description || expense.occurredOn}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.danger, fontWeight: "700" }}>
                    -{money(expense.amountCents, currency, locale)}
                  </Text>
                </Row>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin gastos" body="Registra gastos para conocer tu utilidad real." />
          )}
          <Text style={[styles.note, { color: theme.colors.faint }]}>
            {report.incomes.length} ingresos · {report.returningClients} clientes recurrentes
            {report.incomesTruncated ? " · Algunos ingresos no se muestran por volumen" : ""}
          </Text>
        </>
      ) : null}

      <Sheet open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Registrar gasto">
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <SelectField label="Categoría" value={expenseCategory} options={categoryOptions} onChange={setExpenseCategory} />
          <Field label="Descripción">
            <Input value={expenseDescription} onChangeText={setExpenseDescription} placeholder="Detalle del gasto" />
          </Field>
          <Field label="Monto">
            <Input value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="decimal-pad" placeholder="0.00" prefix="$" />
          </Field>
          <DateInput label="Fecha" value={expenseDate} onChange={setExpenseDate} />
          <Button title="Guardar gasto" icon="check" onPress={() => addExpense.mutate()} loading={addExpense.isPending} />
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 4, marginBottom: 12 },
  twoColumns: { flexDirection: "row", gap: 10 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 4 },
  row: { paddingVertical: 6 },
  note: { fontSize: 11, textAlign: "center", marginTop: 12 },
  sheetContent: { paddingBottom: 16 },
});
