import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { errorText } from "@/domain/format";
import { callPhone, openWhatsApp, type MessageTemplate } from "@/services/contact";
import { Sheet } from "@/ui/components";
import { haptic } from "@/ui/haptics";
import { PressableScale } from "@/ui/motion";
import { useTheme } from "@/ui/theme";

const WHATSAPP_GREEN = "#25D366";

/**
 * Botones "WhatsApp" y "Llamar". WhatsApp abre una hoja con mensajes listos;
 * al elegir uno se abre el chat con el texto escrito para revisarlo y enviarlo.
 */
export function ContactActions({
  phone,
  messages,
  locale,
}: {
  phone: string;
  messages: MessageTemplate[];
  locale?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!phone.trim()) return null;

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      haptic.error();
      Alert.alert("Contacto", errorText(error));
    }
  }

  return (
    <>
      <View style={styles.row}>
        <PressableScale
          onPress={() => setOpen(true)}
          style={[styles.action, { backgroundColor: WHATSAPP_GREEN }]}
          accessibilityLabel="Enviar WhatsApp"
        >
          <MaterialCommunityIcons name="whatsapp" size={20} color="#ffffff" />
          <Text style={[styles.actionText, { color: "#ffffff" }]}>WhatsApp</Text>
        </PressableScale>
        <PressableScale
          onPress={() => void run(() => callPhone(phone))}
          style={[styles.action, { backgroundColor: theme.colors.sunken, borderColor: theme.colors.line, borderWidth: 1 }]}
          accessibilityLabel="Llamar"
        >
          <MaterialCommunityIcons name="phone-outline" size={20} color={theme.colors.text} />
          <Text style={[styles.actionText, { color: theme.colors.text }]}>Llamar</Text>
        </PressableScale>
      </View>

      <Sheet open={open} onClose={() => setOpen(false)} title="Enviar por WhatsApp">
        {messages.map((m) => (
          <PressableScale
            key={m.id}
            feedback="select"
            scaleTo={0.98}
            onPress={() => {
              setOpen(false);
              void run(() => openWhatsApp(phone, m.text, locale));
            }}
            style={[styles.template, { borderColor: theme.colors.line, backgroundColor: theme.colors.background }]}
          >
            <View style={[styles.templateIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <MaterialCommunityIcons name={m.icon as never} size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.templateTitle, { color: theme.colors.text }]}>{m.label}</Text>
              {m.text ? (
                <Text style={[styles.templateText, { color: theme.colors.muted }]} numberOfLines={3}>
                  {m.text}
                </Text>
              ) : null}
            </View>
            <MaterialCommunityIcons name="send" size={18} color={WHATSAPP_GREEN} />
          </PressableScale>
        ))}
        <Text style={[styles.hint, { color: theme.colors.faint }]}>
          Podrás editar el mensaje en WhatsApp antes de enviarlo.
        </Text>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  action: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { fontSize: 15, fontWeight: "700" },
  template: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  templateIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  templateTitle: { fontSize: 15, fontWeight: "700" },
  templateText: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  hint: { fontSize: 12, textAlign: "center", marginTop: 4, marginBottom: 8 },
});
