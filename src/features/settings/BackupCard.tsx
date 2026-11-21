import { Alert, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { errorText } from "@/domain/format";
import { exportBackup, lastBackupAt, pickAndRestoreBackup } from "@/services/backup";
import { invalidateAll, queryClient } from "@/state/query-client";
import { Badge, Button, Card, Row } from "@/ui/components";
import { haptic } from "@/ui/haptics";
import { useTheme } from "@/ui/theme";

const LAST_BACKUP_KEY = ["last-backup"] as const;
const STALE_DAYS = 7;

/** Respaldo manual de la base local y restauración desde un archivo. */
export function BackupCard() {
  const theme = useTheme();
  const last = useQuery({
    queryKey: LAST_BACKUP_KEY,
    queryFn: async () => {
      const at = await lastBackupAt();
      const date = at ? new Date(at) : null;
      return { date, stale: !date || Date.now() - date.getTime() > STALE_DAYS * 86_400_000 };
    },
  });

  const backup = useMutation({
    mutationFn: exportBackup,
    onSuccess: async ({ shared, fileName }) => {
      haptic.success();
      await queryClient.invalidateQueries({ queryKey: LAST_BACKUP_KEY });
      if (!shared) Alert.alert("Respaldo creado", `Se generó ${fileName}, pero este dispositivo no permite compartir archivos.`);
    },
    onError: (error) => {
      haptic.error();
      Alert.alert("No se pudo crear el respaldo", errorText(error));
    },
  });

  const restore = useMutation({
    mutationFn: pickAndRestoreBackup,
    onSuccess: async (restored) => {
      if (!restored) return;
      haptic.success();
      queryClient.clear();
      await invalidateAll();
      Alert.alert("Respaldo restaurado", "Tus datos se reemplazaron con los del respaldo.");
    },
    onError: (error) => {
      haptic.error();
      Alert.alert("No se pudo restaurar", errorText(error));
    },
  });

  function confirmRestore() {
    haptic.warning();
    Alert.alert(
      "Restaurar respaldo",
      "Se reemplazarán TODOS los datos actuales (citas, clientes, finanzas y ajustes) por los del archivo. Esta acción no se puede deshacer.\n\nTe recomendamos crear un respaldo antes.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Elegir archivo", style: "destructive", onPress: () => restore.mutate() },
      ],
    );
  }

  const lastDate = last.data?.date ?? null;
  const stale = last.data?.stale ?? true;

  return (
    <Card>
      <Row style={styles.row}>
        <MaterialCommunityIcons name="shield-check-outline" size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Respaldo de datos</Text>
        <Badge label={stale ? "Pendiente" : "Al día"} tone={stale ? "warning" : "success"} />
      </Row>
      <Text style={[styles.note, { color: theme.colors.muted }]}>
        {lastDate
          ? `Último respaldo ${formatDistanceToNow(lastDate, { addSuffix: true, locale: es })}.`
          : "Aún no has creado ningún respaldo."}{" "}
        Tus datos solo viven en este celular: guarda el archivo en Drive, correo o WhatsApp para no perderlos.
      </Text>
      <Button
        title="Crear y compartir respaldo"
        icon="cloud-upload-outline"
        onPress={() => backup.mutate()}
        loading={backup.isPending}
      />
      <Button
        title="Restaurar desde archivo"
        icon="backup-restore"
        variant="secondary"
        onPress={confirmRestore}
        loading={restore.isPending}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: "600" },
  note: { fontSize: 12, lineHeight: 18 },
});
