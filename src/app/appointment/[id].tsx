import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import {
  deleteAppointment,
  getAppointment,
  saveAppointment,
} from "@/data/repositories/appointments-repository";
import { centsToInput, errorText, pesosToCents, statusLabel, statusTone } from "@/domain/format";
import { deviceTzOffsetMinutes, isoToday, timeNow } from "@/domain/time";
import { PAYMENT_METHODS, STATUSES, type AppointmentStatus } from "@/domain/types";
import { useBusiness, useClients, useEmployees, useServices } from "@/state/hooks";
import { invalidateAll } from "@/state/query-client";
import { Button, Card, Field, Input, LoadingState, PageTitle, Screen, SectionTitle } from "@/ui/components";
import { SelectField, ToggleRow } from "@/ui/forms";
import { ContactActions } from "@/features/contact/ContactActions";
import { appointmentMessages } from "@/services/contact";
import { haptic } from "@/ui/haptics";
import { METHOD_ICONS, STATUS_ICONS } from "@/ui/icons";
import { ChipGroup, DateField, DurationField, TimeField } from "@/ui/pickers";

const MANUAL = "__manual__";
const NONE = "__none__";

export default function AppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id ?? "new");
  const isNew = id === "new";

  const business = useBusiness().data;
  const clients = useClients().data ?? [];
  const services = useServices().data ?? [];
  const employees = useEmployees().data ?? [];

  const [loaded, setLoaded] = useState(isNew);
  const [loading, setLoading] = useState(!isNew);
  const [clientId, setClientId] = useState<string>(NONE);
  const [manualClient, setManualClient] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState<string>(NONE);
  const [manualService, setManualService] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState("0");
  const [employeeId, setEmployeeId] = useState<string>(NONE);
  const [petName, setPetName] = useState("");
  const [localDate, setLocalDate] = useState(isoToday());
  const [localTime, setLocalTime] = useState(timeNow());
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [paymentMethod, setPaymentMethod] = useState<string>(business?.paymentMethods[0] ?? "cash");
  const [notes, setNotes] = useState("");
  const [overrideHours, setOverrideHours] = useState(false);

  useEffect(() => {
    if (isNew || loaded) return;
    let active = true;
    void getAppointment(id).then((appt) => {
      if (!active) return;
      if (!appt) {
        setLoading(false);
        return;
      }
      setClientId(appt.clientId ?? MANUAL);
      setManualClient(appt.clientName);
      setClientPhone(appt.clientPhone);
      setPetName(appt.petName);
      setServiceId(appt.serviceId ?? MANUAL);
      setManualService(appt.serviceName);
      setDuration(appt.durationMin);
      setPrice(centsToInput(appt.priceCents));
      setEmployeeId(appt.employeeId ?? NONE);
      setLocalDate(appt.localDate);
      setLocalTime(appt.localTime);
      setStatus(appt.status);
      setPaymentMethod(appt.paymentMethod ?? business?.paymentMethods[0] ?? "cash");
      setNotes(appt.notes);
      setLoaded(true);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id, isNew, loaded, business?.paymentMethods]);

  function chooseService(value: string) {
    setServiceId(value);
    const service = services.find((s) => s.id === value);
    if (service) {
      setDuration(service.durationMin);
      setPrice(centsToInput(service.priceCents));
    }
  }

  function chooseClient(value: string) {
    setClientId(value);
    const client = clients.find((c) => c.id === value);
    if (client) {
      setManualClient(client.fullName);
      setClientPhone(client.phone);
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const priceCents = pesosToCents(price);
      if (priceCents == null) throw new Error("El precio no es válido");
      const clientName = clientId === MANUAL || clientId === NONE ? manualClient : (clients.find((c) => c.id === clientId)?.fullName ?? manualClient);
      const serviceName = serviceId === MANUAL || serviceId === NONE ? manualService : (services.find((s) => s.id === serviceId)?.name ?? manualService);
      return saveAppointment({
        id: isNew ? undefined : id,
        clientId: clientId === MANUAL || clientId === NONE ? null : clientId,
        clientName,
        clientPhone,
        petName,
        serviceId: serviceId === MANUAL || serviceId === NONE ? null : serviceId,
        serviceName,
        employeeId: employeeId === NONE ? null : employeeId,
        localDate,
        localTime,
        durationMin: duration,
        priceCents,
        notes,
        status,
        paymentMethod: status === "completed" ? paymentMethod : null,
        overrideHours,
        tzOffsetMinutes: deviceTzOffsetMinutes(localDate, localTime),
      });
    },
    onSuccess: async () => {
      haptic.success();
      await invalidateAll();
      router.back();
    },
    onError: (error) => {
      haptic.error();
      Alert.alert("No se pudo guardar", errorText(error));
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteAppointment(id),
    onSuccess: async () => {
      await invalidateAll();
      router.back();
    },
    onError: (error) => Alert.alert("No se pudo eliminar", errorText(error)),
  });

  if (loading) return <Screen><LoadingState label="Cargando cita…" /></Screen>;

  const methodOptions = (business?.paymentMethods ?? PAYMENT_METHODS.map((m) => m.id)).map((m) => ({
    id: m,
    label: PAYMENT_METHODS.find((p) => p.id === m)?.label ?? m,
  }));

  return (
    <Screen>
      <PageTitle title={isNew ? "Nueva cita" : "Editar cita"} subtitle={isNew ? "Completa los datos para agendar." : `Estado actual: ${statusLabel(status)}`} />
      {!isNew ? (
        <ContactActions
          phone={clientPhone}
          locale={business?.locale}
          messages={appointmentMessages(
            {
              clientName: manualClient,
              petName,
              serviceName: manualService || services.find((s) => s.id === serviceId)?.name || "",
              employeeName: employees.find((e) => e.id === employeeId)?.name ?? "",
              localDate,
              localTime,
            },
            business,
          )}
        />
      ) : null}

      <SectionTitle>Cliente y servicio</SectionTitle>
      <Card>
        <SelectField
          label="Cliente"
          value={clientId === NONE ? null : clientId}
          options={[
            { id: MANUAL, label: "Escribir manualmente" },
            ...clients.map((c) => ({ id: c.id, label: c.fullName, hint: c.phone })),
          ]}
          onChange={chooseClient}
          placeholder="Selecciona o escribe manualmente"
        />
        {clientId === MANUAL || clientId === NONE ? (
          <>
            <Field label="Nombre del cliente">
              <Input value={manualClient} onChangeText={setManualClient} placeholder="Nombre completo" icon="account-outline" />
            </Field>
            <Field label="Teléfono">
              <Input value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" placeholder="Opcional" icon="phone-outline" />
            </Field>
          </>
        ) : null}
        {business?.tracksPets ? (
          <Field label="Mascota">
            <Input value={petName} onChangeText={setPetName} placeholder="Nombre de la mascota (opcional)" icon="paw" />
          </Field>
        ) : null}
        <SelectField
          label="Servicio"
          value={serviceId === NONE ? null : serviceId}
          options={[
            { id: MANUAL, label: "Servicio personalizado" },
            ...services.map((s) => ({
              id: s.id,
              label: s.name,
              hint: `${(s.priceCents / 100).toFixed(2)} · ${s.durationMin} min`,
            })),
          ]}
          onChange={chooseService}
          placeholder="Selecciona un servicio"
        />
        {serviceId === MANUAL || serviceId === NONE ? (
          <Field label="Nombre del servicio">
            <Input value={manualService} onChangeText={setManualService} placeholder="Ej. Consulta express" icon="content-cut" />
          </Field>
        ) : null}
        <DurationField value={duration} onChange={setDuration} />
        <Field label="Precio">
          <Input value={price} onChangeText={setPrice} keyboardType="decimal-pad" prefix="$" placeholder="0.00" />
        </Field>
      </Card>

      <SectionTitle>Fecha, hora y responsable</SectionTitle>
      <Card>
        <DateField value={localDate} onChange={setLocalDate} workDays={business?.workDays} allowPast={!isNew} />
        <TimeField
          value={localTime}
          onChange={setLocalTime}
          from={business?.openTime}
          to={business?.closeTime}
          day={localDate}
          durationMin={duration}
        />
        <SelectField
          label="Empleado"
          value={employeeId === NONE ? null : employeeId}
          options={[{ id: NONE, label: "Sin asignar" }, ...employees.map((e) => ({ id: e.id, label: e.name }))]}
          onChange={setEmployeeId}
        />
        <ToggleRow
          label="Excepción de horario"
          value={overrideHours}
          onChange={setOverrideHours}
          hint="Permite agendar fuera del horario configurado."
        />
      </Card>

      <SectionTitle>Estado y notas</SectionTitle>
      <Card>
        <Field label="Estado">
          <ChipGroup<AppointmentStatus>
            value={status}
            options={STATUSES.map((st) => ({
              id: st.id,
              label: st.label,
              icon: STATUS_ICONS[st.id],
              tone: statusTone(st.id),
            }))}
            onChange={setStatus}
          />
        </Field>
        {status === "completed" ? (
          <Field label="Método de pago">
            <ChipGroup
              value={paymentMethod}
              options={methodOptions.map((m) => ({ ...m, icon: METHOD_ICONS[m.id] }))}
              onChange={setPaymentMethod}
            />
          </Field>
        ) : null}
        <Field label="Notas">
          <Input value={notes} onChangeText={setNotes} multiline placeholder="Detalles para el equipo" icon="note-text-outline" />
        </Field>
        <Button
          title={isNew ? "Agendar cita" : "Guardar cambios"}
          icon="content-save"
          onPress={() => save.mutate()}
          loading={save.isPending}
          style={{ marginTop: 8 }}
        />
      </Card>

      {!isNew ? (
        <Button
          title="Eliminar cita"
          variant="danger"
          icon="delete-outline"
          style={styles.danger}
          onPress={() =>
            Alert.alert("Eliminar cita", "¿Estás seguro?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Eliminar", style: "destructive", onPress: () => remove.mutate() },
            ])
          }
        />
      ) : null}
      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: "row", gap: 10 },
  danger: { marginTop: 16 },
});
