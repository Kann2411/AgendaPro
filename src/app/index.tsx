import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { errorText } from "@/domain/format";
import { useBusiness } from "@/state/hooks";
import { Button, EmptyState } from "@/ui/components";
import { useTheme } from "@/ui/theme";

export default function Index() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useBusiness();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  // Un fallo al leer la base de datos no significa que el negocio no exista:
  // no mandar al onboarding (sobrescribiría la configuración al guardar).
  if (isError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: theme.colors.background }}>
        <EmptyState
          title="No se pudieron cargar tus datos"
          body={errorText(error)}
          action={<Button title="Reintentar" icon="refresh" loading={isRefetching} onPress={() => void refetch()} />}
        />
      </View>
    );
  }

  return data ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}
