import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  deleteClient,
  deletePet,
  saveClient,
  savePet,
} from "@/data/repositories/clients-repository";
import { formatDay, formatTime } from "@/domain/time";
import { errorText, money, statusLabel, statusTone } from "@/domain/format";
import { useBusiness, useClient } from "@/state/hooks";
import { invalidateAll } from "@/state/query-client";
import { Badge, Button, Card, EmptyState, Field, Input, LoadingState, PageTitle, Row, Screen, SectionTitle, Sheet } from "@/ui/components";
import { useTheme } from "@/ui/theme";

export default function ClientScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id ?? "new");
  const isNew = id === "new";
  const { data: profile, isLoading } = useClient(id);
  const business = useBusiness().data;
  const [editing, setEditing] = useState(false);
  const [petOpen, setPetOpen] = useState(false);
  const [petEditing, setPetEditing] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [groomingPrefs, setGroomingPrefs] = useState("");

  const client = profile?.client;

  function startEdit() {
    if (!client) return;
    setFullName(client.fullName);
    setPhone(client.phone);
    setEmail(client.email);
    setAddress(client.address);
    setNotes(client.notes);
    setEditing(true);
  }

  function startPet(petId?: string) {
    const pet = client?.pets.find((p) => p.id === petId);
    setPetEditing(pet?.id ?? null);
    setPetName(pet?.name ?? "");
    setSpecies(pet?.species ?? "");
    setBreed(pet?.breed ?? "");
    setAge(pet?.ageYears == null ? "" : String(pet.ageYears));
    setWeight(pet?.weightG == null ? "" : String(pet.weightG));
    setHealthNotes(pet?.healthNotes ?? "");
    setGroomingPrefs(pet?.groomingPrefs ?? "");
    setPetOpen(true);
  }

  const saveClientMutation = useMutation({
    mutationFn: () => saveClient({ id: isNew ? undefined : id, fullName, phone, email, address, notes }),
    onSuccess: async () => {
      await invalidateAll();
      setEditing(false);
      if (isNew) router.back();
    },
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  const removeClientMutation = useMutation({
    mutationFn: () => deleteClient(id),
    onSuccess: async () => {
      await invalidateAll();
      router.back();
    },
    onError: (error) => Alert.alert("No se pudo eliminar", errorText(error)),
  });

  const savePetMutation = useMutation({
    mutationFn: () =>
      savePet({
        id: petEditing ?? undefined,
        clientId: id,
        name: petName,
        species,
        breed,
        ageYears: age === "" ? null : Number(age),
        weightG: weight === "" ? null : Math.round(Number(weight) * 1000),
        healthNotes,
        groomingPrefs,
      }),
    onSuccess: async () => {
      await invalidateAll();
      setPetOpen(false);
    },
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  const removePetMutation = useMutation({
    mutationFn: (petId: string) => deletePet(petId),
    onSuccess: async () => invalidateAll(),
    onError: (error) => Alert.alert("No se pudo eliminar", errorText(error)),
  });

  if (!isNew && isLoading) return <Screen><LoadingState /></Screen>;
  if (!isNew && !client) return <Screen><EmptyState title="Cliente no encontrado" /></Screen>;

  if (isNew || editing) {
    return (
      <Screen>
        <PageTitle title={isNew ? "Nuevo cliente" : "Editar cliente"} subtitle="Datos de contacto y notas generales." />
        <Card>
          <Field label="Nombre completo">
            <Input value={fullName} onChangeText={setFullName} placeholder="Nombre y apellido" />
          </Field>
          <Field label="Teléfono">
            <Input value={phone} onChangeText={setPhone} placeholder="55 1234 5678" keyboardType="phone-pad" />
          </Field>
          <Field label="Correo">
            <Input value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" />
          </Field>
          <Field label="Dirección">
            <Input value={address} onChangeText={setAddress} placeholder="Calle y número" />
          </Field>
          <Field label="Notas">
            <Input value={notes} onChangeText={setNotes} placeholder="Preferencias, alergias, recordatorios…" multiline />
          </Field>
          <Row style={{ marginTop: 8 }}>
            <Button title="Guardar" onPress={() => saveClientMutation.mutate()} loading={saveClientMutation.isPending} icon="content-save" />
            {editing ? <Button title="Cancelar" variant="ghost" onPress={() => setEditing(false)} /> : null}
          </Row>
        </Card>
      </Screen>
    );
  }

  if (!client) return null;

  return (
    <Screen>
      <PageTitle
        title={client.fullName}
        subtitle={client.phone || "Sin teléfono"}
        action={<Button title="Editar" variant="secondary" icon="pencil" onPress={startEdit} />}
      />

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile?.visits ?? 0}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Visitas</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {money(profile?.totalSpent ?? 0, business?.currency, business?.locale)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>Total invertido</Text>
        </Card>
      </View>

      {client.email || client.address || client.notes ? (
        <Card>
          {client.email ? <Text style={[styles.detail, { color: theme.colors.text }]}>✉ {client.email}</Text> : null}
          {client.address ? <Text style={[styles.detail, { color: theme.colors.text }]}>⌖ {client.address}</Text> : null}
          {client.notes ? <Text style={[styles.detail, { color: theme.colors.muted }]}>{client.notes}</Text> : null}
        </Card>
      ) : null}

      {business?.tracksPets ? (
        <>
          <SectionTitle>Mascotas</SectionTitle>
          {client.pets.length ? (
            client.pets.map((pet) => (
              <Card key={pet.id}>
                <Row>
                  <MaterialCommunityIcons name="paw" size={20} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.petName, { color: theme.colors.text }]}>
                      {pet.name} {pet.breed ? `· ${pet.breed}` : ""}
                    </Text>
                    <Text style={[styles.detail, { color: theme.colors.muted }]}>
                      {[pet.species, pet.ageYears != null ? `${pet.ageYears} años` : "", pet.weightG != null ? `${(pet.weightG / 1000).toFixed(1)} kg` : ""]
                        .filter(Boolean)
                        .join(" · ") || "Sin detalles"}
                    </Text>
                    {pet.healthNotes ? <Text style={[styles.detail, { color: theme.colors.muted }]}>{pet.healthNotes}</Text> : null}
                    {pet.groomingPrefs ? <Text style={[styles.detail, { color: theme.colors.muted }]}>{pet.groomingPrefs}</Text> : null}
                  </View>
                </Row>
                <Row>
                  <Button title="Editar" variant="ghost" icon="pencil" onPress={() => startPet(pet.id)} />
                  <Button
                    title="Eliminar"
                    variant="ghost"
                    icon="delete-outline"
                    onPress={() =>
                      Alert.alert("Eliminar mascota", `¿Eliminar a ${pet.name}?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Eliminar", style: "destructive", onPress: () => removePetMutation.mutate(pet.id) },
                      ])
                    }
                  />
                </Row>
              </Card>
            ))
          ) : (
            <EmptyState title="Sin mascotas registradas" body="Agrega una ficha para guardar raza, peso y preferencias." />
          )}
          <Button title="Agregar mascota" icon="paw" variant="secondary" onPress={() => startPet()} />
        </>
      ) : null}

      <SectionTitle>Historial de citas</SectionTitle>
      {profile?.appointments.length ? (
        profile.appointments.map((appt) => (
          <Card key={appt.id} style={styles.apptCard} onPress={() => router.push({ pathname: "/appointment/[id]", params: { id: appt.id } })}>
            <Row style={{ justifyContent: "space-between" }}>
              <View>
                <Text style={[styles.petName, { color: theme.colors.text }]}>{appt.serviceName}</Text>
                <Text style={[styles.detail, { color: theme.colors.muted }]}>
                  {formatDay(appt.localDate)} · {formatTime(appt.localTime)}
                </Text>
              </View>
              <Badge label={statusLabel(appt.status)} tone={statusTone(appt.status)} />
            </Row>
          </Card>
        ))
      ) : (
        <EmptyState title="Sin citas" body="Este cliente aún no tiene citas registradas." />
      )}

      <Button title="Eliminar cliente" variant="danger" icon="delete-outline" style={styles.danger} onPress={() =>
        Alert.alert("Eliminar cliente", `¿Eliminar a ${client.fullName}? Sus citas se conservarán sin vincular.`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Eliminar", style: "destructive", onPress: () => removeClientMutation.mutate() },
        ])
      } />

      <Sheet open={petOpen} onClose={() => setPetOpen(false)} title={petEditing ? "Editar mascota" : "Nueva mascota"}>
        <ScrollView contentContainerStyle={styles.sheetContent}>
          <Field label="Nombre">
            <Input value={petName} onChangeText={setPetName} placeholder="Nombre de la mascota" />
          </Field>
          <Field label="Especie">
            <Input value={species} onChangeText={setSpecies} placeholder="Perro, gato, otra" />
          </Field>
          <Field label="Raza">
            <Input value={breed} onChangeText={setBreed} placeholder="Raza" />
          </Field>
          <View style={styles.twoColumns}>
            <Field label="Edad (años)">
              <Input value={age} onChangeText={setAge} keyboardType="numeric" placeholder="3" />
            </Field>
            <Field label="Peso (kg)">
              <Input value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="12.5" />
            </Field>
          </View>
          <Field label="Notas de salud">
            <Input value={healthNotes} onChangeText={setHealthNotes} multiline placeholder="Alergias, medicamentos…" />
          </Field>
          <Field label="Preferencias de grooming">
            <Input value={groomingPrefs} onChangeText={setGroomingPrefs} multiline placeholder="Temperamento, corte preferido…" />
          </Field>
          <Button title="Guardar mascota" onPress={() => savePetMutation.mutate()} loading={savePetMutation.isPending} />
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  detail: { fontSize: 13, lineHeight: 19 },
  petName: { fontSize: 15, fontWeight: "700" },
  apptCard: { marginBottom: 8 },
  danger: { marginTop: 16 },
  twoColumns: { flexDirection: "row", gap: 10 },
  sheetContent: { gap: 2, paddingBottom: 12 },
});
