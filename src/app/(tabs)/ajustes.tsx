import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { saveBusiness } from "@/data/repositories/business-repository";
import { deleteEmployee, deleteService, saveEmployee, saveService, seedSuggestedServices } from "@/data/repositories/catalog-repository";
import { errorText, centsToInput, pesosToCents } from "@/domain/format";
import { pendingChanges, syncStatus } from "@/sync/sync-manager";
import { BUSINESS_TYPES, PALETTES, PAYMENT_METHODS } from "@/domain/types";
import { useBusiness, useEmployees, useServices } from "@/state/hooks";
import { invalidateAll, queryClient } from "@/state/query-client";
import { qk } from "@/state/query-keys";
import { Button, Card, EmptyState, Field, Input, PageTitle, Row, Screen, SectionTitle, Segmented, Sheet, Badge } from "@/ui/components";
import { MultiSelectField, SelectField, ToggleRow, WeekdayPicker } from "@/ui/forms";
import { DurationField, TimeInput } from "@/ui/pickers";
import { useTheme } from "@/ui/theme";

export default function SettingsScreen() {
  const theme = useTheme();
  const business = useBusiness().data;
  const services = useServices().data ?? [];
  const employees = useEmployees().data ?? [];
  const [tab, setTab] = useState<"business" | "services" | "team">("business");
  const [serviceSheet, setServiceSheet] = useState(false);
  const [employeeSheet, setEmployeeSheet] = useState(false);

  const [name, setName] = useState(business?.name ?? "");
  const [colorPrimary, setColorPrimary] = useState(business?.colorPrimary ?? PALETTES[0].primary);
  const [colorSecondary, setColorSecondary] = useState(business?.colorSecondary ?? PALETTES[0].secondary);
  const [businessType, setBusinessType] = useState(business?.businessType ?? "groomer");
  const [phone, setPhone] = useState(business?.phone ?? "");
  const [email, setEmail] = useState(business?.email ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [openTime, setOpenTime] = useState(business?.openTime ?? "09:00");
  const [closeTime, setCloseTime] = useState(business?.closeTime ?? "18:00");
  const [workDays, setWorkDays] = useState(business?.workDays ?? [1, 2, 3, 4, 5]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(business?.paymentMethods ?? ["cash"]);
  const [currency, setCurrency] = useState(business?.currency ?? "MXN");
  const [appearance, setAppearance] = useState<"light" | "dark" | "system">(business?.theme ?? "light");

  const [serviceId, setServiceId] = useState<string | undefined>();
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [servicePrice, setServicePrice] = useState("0");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [serviceActive, setServiceActive] = useState(true);

  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");
  const [employeeStart, setEmployeeStart] = useState("09:00");
  const [employeeEnd, setEmployeeEnd] = useState("18:00");
  const [employeeDays, setEmployeeDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [employeeActive, setEmployeeActive] = useState(true);

  const saveBusinessMutation = useMutation({
    mutationFn: () =>
      saveBusiness({
        name,
        colorPrimary,
        colorSecondary,
        businessType,
        tracksPets: business?.tracksPets ?? true,
        theme: appearance,
        phone,
        email,
        address,
        currency,
        locale: business?.locale ?? "es-MX",
        openTime,
        closeTime,
        workDays,
        paymentMethods,
        whatsappPhone: business?.whatsappPhone ?? "",
      }),
    onSuccess: async () => invalidateAll(),
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  const seedMutation = useMutation({
    mutationFn: seedSuggestedServices,
    onSuccess: async (count) => {
      await invalidateAll();
      Alert.alert("Listo", count ? `Se agregaron ${count} servicios sugeridos.` : "Ya tienes todos los servicios sugeridos.");
    },
    onError: (error) => Alert.alert("No se pudo completar", errorText(error)),
  });

  const saveServiceMutation = useMutation({
    mutationFn: () => {
      const priceCents = pesosToCents(servicePrice);
      if (priceCents == null) throw new Error("Precio no válido");
      return saveService({
        id: serviceId,
        name: serviceName,
        category: serviceCategory,
        priceCents,
        durationMin: Number(serviceDuration),
        active: serviceActive,
      });
    },
    onSuccess: async () => {
      await invalidateAll();
      setServiceSheet(false);
    },
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  const saveEmployeeMutation = useMutation({
    mutationFn: () =>
      saveEmployee({
        id: employeeId,
        name: employeeName,
        phone: employeePhone,
        role: employeeRole,
        workStart: employeeStart,
        workEnd: employeeEnd,
        workDays: employeeDays,
        serviceIds: [],
        active: employeeActive,
      }),
    onSuccess: async () => {
      await invalidateAll();
      setEmployeeSheet(false);
    },
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  const removeServiceMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: async () => invalidateAll(),
    onError: (error) => Alert.alert("No se pudo eliminar", errorText(error)),
  });

  const removeEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: async () => invalidateAll(),
    onError: (error) => Alert.alert("No se pudo eliminar", errorText(error)),
  });

  function openService(id?: string) {
    const service = services.find((s) => s.id === id);
    setServiceId(service?.id);
    setServiceName(service?.name ?? "");
    setServiceCategory(service?.category ?? "");
    setServicePrice(service ? centsToInput(service.priceCents) : "0");
    setServiceDuration(String(service?.durationMin ?? 30));
    setServiceActive(service?.active ?? true);
    setServiceSheet(true);
  }

  function openEmployee(id?: string) {
    const employee = employees.find((e) => e.id === id);
    setEmployeeId(employee?.id);
    setEmployeeName(employee?.name ?? "");
    setEmployeeRole(employee?.role ?? "");
    setEmployeePhone(employee?.phone ?? "");
    setEmployeeStart(employee?.workStart ?? "09:00");
    setEmployeeEnd(employee?.workEnd ?? "18:00");
    setEmployeeDays(employee?.workDays ?? [1, 2, 3, 4, 5]);
    setEmployeeActive(employee?.active ?? true);
    setEmployeeSheet(true);
  }

  return (
    <Screen>
      <PageTitle title="Ajustes" subtitle="Negocio, servicios, equipo y privacidad" />
      <Row style={styles.tabs}>
        <Button title="Negocio" variant={tab === "business" ? "primary" : "secondary"} onPress={() => setTab("business")} />
        <Button title="Servicios" variant={tab === "services" ? "primary" : "secondary"} onPress={() => setTab("services")} />
        <Button title="Equipo" variant={tab === "team" ? "primary" : "secondary"} onPress={() => setTab("team")} />
      </Row>

      {tab === "business" ? (
        <>
          <Card>
            <Field label="Nombre del negocio">
              <Input value={name} onChangeText={setName} />
            </Field>
            <SelectField
              label="Tipo de negocio"
              value={businessType}
              options={BUSINESS_TYPES.map((b) => ({ id: b.id, label: b.label }))}
              onChange={setBusinessType}
            />
            <View style={styles.twoColumns}>
              <Field label="Color principal">
                <Input value={colorPrimary} onChangeText={setColorPrimary} placeholder="#1f4d40" />
              </Field>
              <Field label="Color secundario">
                <Input value={colorSecondary} onChangeText={setColorSecondary} placeholder="#8d6a3f" />
              </Field>
            </View>
            <Field label="Apariencia">
              <Segmented
                options={[
                  { id: "light", label: "Claro" },
                  { id: "dark", label: "Oscuro" },
                  { id: "system", label: "Sistema" },
                ]}
                value={appearance}
                onChange={setAppearance}
              />
            </Field>
            <Field label="Teléfono">
              <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </Field>
            <Field label="Correo">
              <Input value={email} onChangeText={setEmail} keyboardType="email-address" />
            </Field>
            <Field label="Dirección">
              <Input value={address} onChangeText={setAddress} />
            </Field>
            <Field label="Moneda">
              <Input value={currency} onChangeText={setCurrency} />
            </Field>
            <View style={styles.twoColumns}>
              <TimeInput label="Apertura" value={openTime} onChange={setOpenTime} />
              <TimeInput label="Cierre" value={closeTime} onChange={setCloseTime} />
            </View>
            <WeekdayPicker value={workDays} onChange={setWorkDays} />
            <MultiSelectField
              label="Métodos de pago activos"
              values={paymentMethods}
              options={PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))}
              onChange={setPaymentMethods}
            />
            <Button title="Guardar cambios" icon="content-save" onPress={() => saveBusinessMutation.mutate()} loading={saveBusinessMutation.isPending} />
          </Card>
          <SectionTitle>Datos y sincronización</SectionTitle>
          <Card>
            <Row style={styles.infoRow}>
              <MaterialCommunityIcons name="cellphone" size={20} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, flex: 1 }}>Almacenamiento local</Text>
              <Badge label="Activo" tone="success" />
            </Row>
            <Row style={styles.infoRow}>
              <MaterialCommunityIcons name="cloud-outline" size={20} color={theme.colors.muted} />
              <Text style={{ color: theme.colors.text, flex: 1 }}>Sincronización en la nube</Text>
              <Badge label="Preparada" tone="warning" />
            </Row>
            <Text style={[styles.note, { color: theme.colors.muted }]}>
              Adaptador: {syncStatus().adapter ?? "ninguno"}. Los cambios se acumulan en una cola segura hasta que actives la nube.
            </Text>
            <Button title="Verificar cambios pendientes" variant="secondary" icon="refresh" onPress={async () => {
              const count = await pendingChanges();
              await queryClient.invalidateQueries({ queryKey: qk.pendingChanges });
              Alert.alert("Cola de sincronización", `${count} cambio(s) pendiente(s).`);
            }} />
          </Card>
        </>
      ) : null}

      {tab === "services" ? (
        <>
          <Row style={styles.headerRow}>
            <Text style={[styles.count, { color: theme.colors.muted }]}>{services.length} servicios</Text>
            <Button title="Nuevo" icon="plus" onPress={() => openService()} />
          </Row>
          {services.length ? (
            services.map((service) => (
              <Card key={service.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{service.name}</Text>
                    <Text style={[styles.itemDetail, { color: theme.colors.muted }]}>
                      {service.category || "General"} · {service.durationMin} min · {centsToInput(service.priceCents)}
                    </Text>
                  </View>
                  <Badge label={service.active ? "Activo" : "Inactivo"} tone={service.active ? "success" : "neutral"} />
                </Row>
                <Row>
                  <Button title="Editar" variant="ghost" icon="pencil" onPress={() => openService(service.id)} />
                  <Button title="Eliminar" variant="ghost" icon="delete-outline" onPress={() =>
                    Alert.alert("Eliminar servicio", service.name, [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Eliminar", style: "destructive", onPress: () => removeServiceMutation.mutate(service.id) },
                    ])
                  } />
                </Row>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin servicios" body="Agrega tus servicios o carga los sugeridos para tu tipo de negocio." />
          )}
          <Button title="Cargar servicios sugeridos" variant="secondary" icon="auto-fix" onPress={() => seedMutation.mutate()} loading={seedMutation.isPending} />
        </>
      ) : null}

      {tab === "team" ? (
        <>
          <Row style={styles.headerRow}>
            <Text style={[styles.count, { color: theme.colors.muted }]}>{employees.length} personas</Text>
            <Button title="Nuevo" icon="plus" onPress={() => openEmployee()} />
          </Row>
          {employees.length ? (
            employees.map((employee) => (
              <Card key={employee.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{employee.name}</Text>
                    <Text style={[styles.itemDetail, { color: theme.colors.muted }]}>
                      {employee.role || "Sin rol"} · {employee.workStart}–{employee.workEnd}
                    </Text>
                  </View>
                  <Badge label={employee.active ? "Activo" : "Inactivo"} tone={employee.active ? "success" : "neutral"} />
                </Row>
                <Row>
                  <Button title="Editar" variant="ghost" icon="pencil" onPress={() => openEmployee(employee.id)} />
                  <Button title="Eliminar" variant="ghost" icon="delete-outline" onPress={() =>
                    Alert.alert("Eliminar empleado", employee.name, [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Eliminar", style: "destructive", onPress: () => removeEmployeeMutation.mutate(employee.id) },
                    ])
                  } />
                </Row>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin equipo" body="Agrega a las personas que atienden citas." />
          )}
        </>
      ) : null}

      <Sheet open={serviceSheet} onClose={() => setServiceSheet(false)} title={serviceId ? "Editar servicio" : "Nuevo servicio"}>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <Field label="Nombre">
            <Input value={serviceName} onChangeText={setServiceName} placeholder="Nombre del servicio" />
          </Field>
          <Field label="Categoría">
            <Input value={serviceCategory} onChangeText={setServiceCategory} placeholder="Ej. Higiene" />
          </Field>
          <View style={styles.twoColumns}>
            <Field label="Precio">
              <Input value={servicePrice} onChangeText={setServicePrice} keyboardType="decimal-pad" />
            </Field>
          </View>
          <DurationField value={Number(serviceDuration)} onChange={(n) => setServiceDuration(String(n))} />
          <ToggleRow label="Servicio activo" value={serviceActive} onChange={setServiceActive} />
          <Button title="Guardar servicio" onPress={() => saveServiceMutation.mutate()} loading={saveServiceMutation.isPending} />
        </ScrollView>
      </Sheet>

      <Sheet open={employeeSheet} onClose={() => setEmployeeSheet(false)} title={employeeId ? "Editar empleado" : "Nuevo empleado"}>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <Field label="Nombre">
            <Input value={employeeName} onChangeText={setEmployeeName} placeholder="Nombre completo" />
          </Field>
          <Field label="Rol">
            <Input value={employeeRole} onChangeText={setEmployeeRole} placeholder="Ej. Estilista" />
          </Field>
          <Field label="Teléfono">
            <Input value={employeePhone} onChangeText={setEmployeePhone} keyboardType="phone-pad" />
          </Field>
          <View style={styles.twoColumns}>
            <TimeInput label="Entrada" value={employeeStart} onChange={setEmployeeStart} />
            <TimeInput label="Salida" value={employeeEnd} onChange={setEmployeeEnd} />
          </View>
          <WeekdayPicker value={employeeDays} onChange={setEmployeeDays} label="Días que trabaja" />
          <ToggleRow label="Empleado activo" value={employeeActive} onChange={setEmployeeActive} />
          <Button title="Guardar empleado" onPress={() => saveEmployeeMutation.mutate()} loading={saveEmployeeMutation.isPending} />
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 6, marginBottom: 12 },
  twoColumns: { flexDirection: "row", gap: 10 },
  headerRow: { justifyContent: "space-between", marginTop: 8 },
  count: { fontSize: 13 },
  itemTitle: { fontSize: 15, fontWeight: "700" },
  itemDetail: { fontSize: 12 },
  infoRow: { paddingVertical: 8 },
  note: { fontSize: 12, lineHeight: 18 },
  sheetContent: { paddingBottom: 16 },
});
