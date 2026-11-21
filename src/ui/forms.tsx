import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Field, Sheet } from "./components";
import { haptic } from "./haptics";
import { PressableScale } from "./motion";
import { useTheme } from "./theme";

export type Option<T extends string = string> = {
  id: T;
  label: string;
  hint?: string;
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecciona una opción",
  hint,
}: {
  label: string;
  value: T | null | undefined;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  hint?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <>
      <Field label={label} hint={hint}>
        <PressableScale
          onPress={() => setOpen(true)}
          scaleTo={0.98}
          style={[styles.control, { borderColor: theme.colors.line, backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.controlText, { color: selected ? theme.colors.text : theme.colors.faint }]}>
            {selected?.label ?? placeholder}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.muted} />
        </PressableScale>
      </Field>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => {
              haptic.select();
              onChange(option.id);
              setOpen(false);
            }}
            style={({ pressed }) => [styles.option, { borderBottomColor: theme.colors.divider }, pressed && { opacity: 0.6 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{option.label}</Text>
              {option.hint ? <Text style={[styles.optionHint, { color: theme.colors.muted }]}>{option.hint}</Text> : null}
            </View>
            {value === option.id ? (
              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

export function MultiSelectField({
  label,
  values,
  options,
  onChange,
  hint,
}: {
  label: string;
  values: string[];
  options: Option[];
  onChange: (values: string[]) => void;
  hint?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const summary = options.filter((o) => values.includes(o.id)).map((o) => o.label).join(", ");
  return (
    <>
      <Field label={label} hint={hint}>
        <PressableScale
          onPress={() => setOpen(true)}
          scaleTo={0.98}
          style={[styles.control, { borderColor: theme.colors.line, backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.controlText, { color: summary ? theme.colors.text : theme.colors.faint }]} numberOfLines={2}>
            {summary || "Ninguno"}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.muted} />
        </PressableScale>
      </Field>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {options.map((option) => {
          const checked = values.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => {
                haptic.select();
                onChange(checked ? values.filter((v) => v !== option.id) : [...values, option.id]);
              }}
              style={({ pressed }) => [styles.option, { borderBottomColor: theme.colors.divider }, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.optionLabel, { color: theme.colors.text, flex: 1 }]}>{option.label}</Text>
              <MaterialCommunityIcons
                name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
                size={20}
                color={checked ? theme.colors.primary : theme.colors.faint}
              />
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const WEEKDAY_OPTIONS: Option[] = [
  { id: "0", label: "Domingo" },
  { id: "1", label: "Lunes" },
  { id: "2", label: "Martes" },
  { id: "3", label: "Miércoles" },
  { id: "4", label: "Jueves" },
  { id: "5", label: "Viernes" },
  { id: "6", label: "Sábado" },
];

export function WeekdayPicker({
  value,
  onChange,
  label = "Días laborales",
}: {
  value: number[];
  onChange: (value: number[]) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <View style={styles.weekRow}>
        {WEEKDAY_OPTIONS.map((day) => {
          const active = value.includes(Number(day.id));
          return (
            <WeekChip
              key={day.id}
              label={day.label.slice(0, 3)}
              active={active}
              onPress={() =>
                onChange(active ? value.filter((d) => d !== Number(day.id)) : [...value, Number(day.id)].sort())
              }
            />
          );
        })}
      </View>
    </Field>
  );
}

function WeekChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      feedback="select"
      scaleTo={0.9}
      style={[styles.weekChip, { backgroundColor: active ? theme.colors.primary : theme.colors.sunken }]}
    >
      <Text style={[styles.weekChipText, { color: active ? theme.colors.primaryFg : theme.colors.muted }]}>{label}</Text>
    </PressableScale>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.optionHint, { color: theme.colors.muted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptic.select();
          onChange(v);
        }}
        trackColor={{ false: theme.colors.line, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  controlText: { fontSize: 15, flex: 1 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  optionLabel: { fontSize: 15, fontWeight: "600" },
  optionHint: { fontSize: 12, marginTop: 2 },
  weekRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  weekChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, minWidth: 48, alignItems: "center" },
  weekChipText: { fontSize: 12, fontWeight: "700" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
});
