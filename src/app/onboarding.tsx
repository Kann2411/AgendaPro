import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { saveBusiness } from "@/data/repositories/business-repository";
import { seedSuggestedServices } from "@/data/repositories/catalog-repository";
import {
  BUSINESS_TYPES,
  CURRENCIES,
  LOCALES,
  PALETTES,
  PAYMENT_METHODS,
  type BusinessType,
} from "@/domain/types";
import { errorText } from "@/domain/format";
import { invalidateAll } from "@/state/query-client";
import { Button, Card, Field, Input, PageTitle, SectionTitle } from "@/ui/components";
import { MultiSelectField, SelectField, ToggleRow, WeekdayPicker } from "@/ui/forms";
import { haptic } from "@/ui/haptics";
import { TimeInput } from "@/ui/pickers";
import { PressableScale } from "@/ui/motion";
import { useTheme } from "@/ui/theme";

const typeOptions = BUSINESS_TYPES.map((b) => ({ id: b.id, label: b.label }));
const methodOptions = PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }));
const currencyOptions = CURRENCIES.map((c) => ({ id: c, label: c }));
const localeOptions = LOCALES.map((l) => ({ id: l.id, label: l.label }));

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("groomer");
  const [tracksPets, setTracksPets] = useState(true);
  const [palette, setPalette] = useState(0);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [locale, setLocale] = useState("es-MX");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [workDays, setWorkDays] = useState([1, 2, 3, 4, 5]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["cash"]);

  const save = useMutation({
    mutationFn: async () => {
      const colors = PALETTES[palette] ?? PALETTES[0];
      await saveBusiness({
        name,
        businessType,
        tracksPets,
        colorPrimary: colors.primary,
        colorSecondary: colors.secondary,
        theme: "light",
        phone,
        email,
        address,
        currency,
        locale,
        openTime,
        closeTime,
        workDays,
        paymentMethods,
        whatsappPhone: "",
      });
      await seedSuggestedServices();
    },
    onSuccess: async () => {
      haptic.success();
      await invalidateAll();
      // Reemplaza el onboarding para que "atrás" no regrese a esta pantalla.
      router.replace("/(tabs)");
    },
    onError: (error) => Alert.alert("No se pudo guardar", errorText(error)),
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
        <MaterialCommunityIcons name="calendar-check" size={34} color={theme.colors.primaryFg} />
        <Text style={[styles.heroTitle, { color: theme.colors.primaryFg }]}>Bienvenido a AgendaPro</Text>
        <Text style={[styles.heroBody, { color: theme.colors.primaryFg }]}>
          Configura tu negocio una vez. Todos tus datos se guardan en este dispositivo y estarán listos para sincronizar en el futuro.
        </Text>
      </View>

      <PageTitle title="Datos del negocio" subtitle="Los usarás en citas, reportes y recordatorios." />

      <Card>
        <Field label="Nombre del negocio">
          <Input value={name} onChangeText={setName} placeholder="Ej. Estudio Canino Luna" icon="storefront-outline" />
        </Field>
        <SelectField label="Tipo de negocio" value={businessType} options={typeOptions} onChange={setBusinessType} />
        <ToggleRow
          label="Registrar mascotas"
          value={tracksPets}
          onChange={setTracksPets}
          hint="Activa fichas de mascotas en el expediente de cada cliente."
        />
      </Card>

      <SectionTitle>Identidad visual</SectionTitle>
      <Card>
        <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>Paleta de color</Text>
        <View style={styles.paletteRow}>
          {PALETTES.map((item, index) => (
            <PressablePalette
              key={item.name}
              name={item.name}
              primary={item.primary}
              secondary={item.secondary}
              active={index === palette}
              onPress={() => setPalette(index)}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>Contacto y moneda</SectionTitle>
      <Card>
        <Field label="Teléfono">
          <Input value={phone} onChangeText={setPhone} placeholder="55 1234 5678" keyboardType="phone-pad" icon="phone-outline" />
        </Field>
        <Field label="Correo">
          <Input value={email} onChangeText={setEmail} placeholder="hola@minegocio.com" keyboardType="email-address" icon="email-outline" />
        </Field>
        <Field label="Dirección">
          <Input value={address} onChangeText={setAddress} placeholder="Calle, número, colonia" icon="map-marker-outline" />
        </Field>
        <SelectField label="Moneda" value={currency} options={currencyOptions} onChange={setCurrency} />
        <SelectField label="Idioma y formato" value={locale} options={localeOptions} onChange={setLocale} />
      </Card>

      <SectionTitle>Horario y pagos</SectionTitle>
      <Card>
        <View style={styles.twoColumns}>
          <TimeInput label="Apertura" value={openTime} onChange={setOpenTime} />
          <TimeInput label="Cierre" value={closeTime} onChange={setCloseTime} />
        </View>
        <WeekdayPicker value={workDays} onChange={setWorkDays} />
        <MultiSelectField
          label="Métodos de pago"
          values={paymentMethods}
          options={methodOptions}
          onChange={setPaymentMethods}
        />
      </Card>

      <Button
        title={save.isPending ? "Guardando…" : "Crear mi agenda"}
        onPress={() => save.mutate()}
        loading={save.isPending}
        icon="check"
        style={styles.saveButton}
      />
      <Text style={[styles.footer, { color: theme.colors.faint }]}>
        Podrás cambiar todo esto más adelante en Ajustes.
      </Text>
    </ScrollView>
  );
}

function PressablePalette({
  name,
  primary,
  secondary,
  active,
  onPress,
}: {
  name: string;
  primary: string;
  secondary: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} feedback="select" scaleTo={0.9} style={styles.paletteItem}>
      <View
        style={[
          styles.paletteSwatch,
          { borderColor: active ? theme.colors.text : "transparent", backgroundColor: primary },
        ]}
      >
        <View style={[styles.paletteSecondary, { backgroundColor: secondary }]} />
      </View>
      <Text style={[styles.paletteName, { color: active ? theme.colors.primary : theme.colors.muted }]}>{name}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 4 },
  hero: { borderRadius: 20, padding: 20, gap: 8, marginBottom: 20 },
  heroTitle: { fontSize: 24, fontWeight: "800" },
  heroBody: { fontSize: 13, lineHeight: 19, opacity: 0.9 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  twoColumns: { flexDirection: "row", gap: 10 },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  paletteItem: { width: 90, alignItems: "center" },
  paletteSwatch: { width: 54, height: 40, borderRadius: 12, borderWidth: 2, overflow: "hidden" },
  paletteSecondary: { position: "absolute", right: 0, bottom: 0, width: 20, height: 20, borderTopLeftRadius: 10 },
  paletteName: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  saveButton: { marginTop: 20 },
  footer: { textAlign: "center", fontSize: 12, marginTop: 12 },
});
