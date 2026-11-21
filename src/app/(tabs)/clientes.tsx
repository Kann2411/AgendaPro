import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useClients } from "@/state/hooks";
import { Button, Card, EmptyState, Input, LoadingState, PageTitle, Screen } from "@/ui/components";
import { useTheme } from "@/ui/theme";

export default function ClientsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, isLoading, isRefetching, refetch } = useClients(query);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <PageTitle
        title="Clientes"
        subtitle={`${data?.length ?? 0} en tu directorio`}
        action={<Button title="Nuevo" icon="plus" onPress={() => router.push({ pathname: "/client/[id]", params: { id: "new" } })} />}
      />
      <Input value={query} onChangeText={setQuery} placeholder="Buscar por nombre, teléfono o correo" />
      <View style={{ height: 12 }} />
      {isLoading ? <LoadingState /> : null}
      {!isLoading && !data?.length ? (
        <EmptyState
          title={query ? "Sin resultados" : "Aún no hay clientes"}
          body={query ? "Prueba con otro nombre o teléfono." : "Agrega tu primer cliente para construir su expediente."}
          action={<Button title="Agregar cliente" onPress={() => router.push({ pathname: "/client/[id]", params: { id: "new" } })} />}
        />
      ) : null}
      {data?.map((client) => (
        <Card key={client.id} style={styles.clientCard} onPress={() => router.push({ pathname: "/client/[id]", params: { id: client.id } })}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.sunken }]}>
            <MaterialCommunityIcons name="account-outline" size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{client.fullName}</Text>
            <Text style={[styles.detail, { color: theme.colors.muted }]}>{client.phone || "Sin teléfono"}</Text>
            {client.pets.length ? (
              <Text style={[styles.detail, { color: theme.colors.secondary }]}>
                {client.pets.map((pet) => pet.name).join(", ")}
              </Text>
            ) : null}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.faint} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clientCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700" },
  detail: { fontSize: 12 },
});
