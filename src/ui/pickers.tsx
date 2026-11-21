import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RNDateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { addDays, addMinutes, formatLongDay, formatTime, isoToday, minutes, parseDay, timeNow } from "@/domain/time";
import { Button, Sheet } from "./components";
import { haptic } from "./haptics";
import { PressableScale } from "./motion";
import { useTheme } from "./theme";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function hhmmToDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

type NativeMode = "date" | "time";

/**
 * Abre el selector nativo: diálogo Material 3 en Android y una hoja con el
 * picker inline en iOS. Devuelve el estado de la hoja de iOS para renderizarla.
 */
function useNativePicker(mode: NativeMode, onPick: (date: Date) => void) {
  const [iosValue, setIosValue] = useState<Date | null>(null);

  function open(value: Date, opts: { title?: string; minimumDate?: Date } = {}) {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode,
        design: "material",
        title: opts.title,
        is24Hour: false,
        minimumDate: opts.minimumDate,
        firstDayOfWeek: 1,
        onValueChange: (_event, date) => {
          haptic.select();
          onPick(date);
        },
      });
      return;
    }
    setIosValue(value);
  }

  const iosSheet =
    Platform.OS === "ios" && iosValue ? (
      <Sheet open onClose={() => setIosValue(null)} title={mode === "date" ? "Elegir fecha" : "Elegir hora"}>
        <RNDateTimePicker
          value={iosValue}
          mode={mode}
          display={mode === "date" ? "inline" : "spinner"}
          locale="es-MX"
          onValueChange={(_event, date) => setIosValue(date)}
        />
        <Button
          title="Listo"
          icon="check"
          onPress={() => {
            haptic.select();
            onPick(iosValue);
            setIosValue(null);
          }}
        />
      </Sheet>
    ) : null;

  return { open, iosSheet };
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

export type ChipTone = "primary" | "success" | "warning" | "danger" | "neutral";

export function Chip({
  label,
  icon,
  active,
  onPress,
  disabled,
  tone = "primary",
}: {
  label: string;
  icon?: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  tone?: ChipTone;
}) {
  const theme = useTheme();
  const solid = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    neutral: theme.colors.muted,
  }[tone];
  const fg = active ? (tone === "primary" ? theme.colors.primaryFg : theme.colors.surface) : theme.colors.text;
  return (
    <PressableScale
      feedback="select"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        {
          backgroundColor: active ? solid : theme.colors.surface,
          borderColor: active ? solid : theme.colors.line,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon as never} size={16} color={active ? fg : theme.colors.muted} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </PressableScale>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; icon?: string; tone?: ChipTone }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => (
        <Chip
          key={o.id}
          label={o.label}
          icon={o.icon}
          tone={o.tone}
          active={o.id === value}
          onPress={() => onChange(o.id)}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Encabezado común de los pickers                                     */
/* ------------------------------------------------------------------ */

function PickerHeader({
  label,
  value,
  caption,
  actionIcon,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  caption?: string;
  actionIcon: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
        <Animated.Text
          key={value}
          entering={FadeIn.duration(180)}
          style={[styles.value, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {value}
        </Animated.Text>
        {caption ? <Text style={[styles.caption, { color: theme.colors.muted }]}>{caption}</Text> : null}
      </View>
      <PressableScale
        onPress={onAction}
        style={[styles.headerAction, { backgroundColor: theme.colors.primarySoft }]}
        accessibilityLabel={actionLabel}
      >
        <MaterialCommunityIcons name={actionIcon as never} size={18} color={theme.colors.primary} />
        <Text style={[styles.headerActionText, { color: theme.colors.primary }]}>{actionLabel}</Text>
      </PressableScale>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Fecha                                                               */
/* ------------------------------------------------------------------ */

const DAY_W = 58;
const DAY_GAP = 8;

/**
 * Selector de fecha con tira de días deslizable (próximas semanas) y acceso
 * al calendario nativo. Los días no laborales se muestran atenuados.
 */
export function DateField({
  label = "Fecha",
  value,
  onChange,
  workDays,
  days = 28,
  allowPast = false,
}: {
  label?: string;
  value: string;
  onChange: (day: string) => void;
  workDays?: number[];
  days?: number;
  allowPast?: boolean;
}) {
  const theme = useTheme();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const today = isoToday();
  const start = allowPast ? addDays(today, -7) : today;
  const strip = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days]);
  const native = useNativePicker("date", (date) => onChange(format(date, "yyyy-MM-dd")));

  const index = strip.indexOf(value);
  useEffect(() => {
    if (index < 0) return;
    const x = Math.max(0, index * (DAY_W + DAY_GAP) - DAY_W);
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: true }), 60);
    return () => clearTimeout(t);
  }, [index]);

  const relative = value === today ? "Hoy" : value === addDays(today, 1) ? "Mañana" : undefined;
  const offDay = workDays && !workDays.includes(parseDay(value).getDay());

  return (
    <View style={styles.block}>
      <PickerHeader
        label={label}
        value={formatLongDay(value)}
        caption={[relative, offDay ? "Día no laboral" : undefined].filter(Boolean).join(" · ") || undefined}
        actionIcon="calendar-month-outline"
        actionLabel="Calendario"
        onAction={() =>
          native.open(parseDay(value), {
            title: label,
            minimumDate: allowPast ? undefined : parseDay(today),
          })
        }
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: DAY_GAP, paddingVertical: 4 }}
      >
        {strip.map((day) => {
          const d = parseDay(day);
          const active = day === value;
          const closed = workDays ? !workDays.includes(d.getDay()) : false;
          const isToday = day === today;
          return (
            <PressableScale
              key={day}
              feedback="select"
              scaleTo={0.92}
              onPress={() => onChange(day)}
              style={[
                styles.day,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : isToday ? theme.colors.primary : theme.colors.line,
                  opacity: closed && !active ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[styles.dayWeek, { color: active ? theme.colors.primaryFg : theme.colors.muted }]}>
                {format(d, "EEE", { locale: es }).replace(".", "")}
              </Text>
              <Text style={[styles.dayNum, { color: active ? theme.colors.primaryFg : theme.colors.text }]}>
                {d.getDate()}
              </Text>
              <Text style={[styles.dayMonth, { color: active ? theme.colors.primaryFg : theme.colors.faint }]}>
                {format(d, "MMM", { locale: es }).replace(".", "")}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
      {native.iosSheet}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Hora                                                                */
/* ------------------------------------------------------------------ */

/**
 * Selector de hora con horarios sugeridos dentro del horario del negocio y
 * acceso al reloj nativo para cualquier otra hora. Si la fecha es hoy, oculta
 * los horarios que ya pasaron. Muestra la hora de término si hay duración.
 */
export function TimeField({
  label = "Hora",
  value,
  onChange,
  from = "08:00",
  to = "20:00",
  step = 30,
  day,
  durationMin,
}: {
  label?: string;
  value: string;
  onChange: (time: string) => void;
  from?: string;
  to?: string;
  step?: number;
  day?: string;
  durationMin?: number;
}) {
  const theme = useTheme();
  const native = useNativePicker("time", (date) => onChange(format(date, "HH:mm")));

  const slots = useMemo(() => {
    const out: string[] = [];
    const start = minutes(from);
    const end = minutes(to);
    const now = day === isoToday() ? minutes(timeNow()) : -1;
    for (let t = start; t < end; t += step) {
      if (t < now) continue;
      out.push(addMinutes("00:00", t).hhmm);
    }
    return out;
  }, [from, to, step, day]);

  const end = durationMin && durationMin > 0 ? addMinutes(value, durationMin) : null;
  const outside = minutes(value) < minutes(from) || (end ? minutes(end.hhmm) : minutes(value)) > minutes(to);

  return (
    <View style={styles.block}>
      <PickerHeader
        label={label}
        value={formatTime(value)}
        caption={[
          end ? `Termina ${formatTime(end.hhmm)}${end.overflow ? " (día siguiente)" : ""}` : undefined,
          outside ? "Fuera de horario" : undefined,
        ]
          .filter(Boolean)
          .join(" · ") || undefined}
        actionIcon="clock-outline"
        actionLabel="Reloj"
        onAction={() => native.open(hhmmToDate(value), { title: label })}
      />
      {slots.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
          {slots.map((slot) => (
            <Chip key={slot} label={formatTime(slot)} active={slot === value} onPress={() => onChange(slot)} />
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.caption, { color: theme.colors.faint }]}>
          No quedan horarios sugeridos para este día. Usa el reloj para elegir otra hora.
        </Text>
      )}
      {native.iosSheet}
    </View>
  );
}

/**
 * Campo compacto de fecha (filtros, gastos): muestra la fecha y abre el
 * calendario nativo al tocar.
 */
export function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
}) {
  const theme = useTheme();
  const native = useNativePicker("date", (date) => onChange(format(date, "yyyy-MM-dd")));
  return (
    <View style={[styles.block, { flex: 1 }]}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <PressableScale
        onPress={() => native.open(parseDay(value), { title: label })}
        style={[styles.compact, { borderColor: theme.colors.line, backgroundColor: theme.colors.surface }]}
      >
        <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.compactText, { color: theme.colors.text }]} numberOfLines={1}>
          {format(parseDay(value), "d MMM yyyy", { locale: es })}
        </Text>
      </PressableScale>
      {native.iosSheet}
    </View>
  );
}

/**
 * Campo compacto de hora (para horarios de apertura/cierre): muestra la hora
 * y abre el reloj nativo al tocar.
 */
export function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
}) {
  const theme = useTheme();
  const native = useNativePicker("time", (date) => onChange(format(date, "HH:mm")));
  return (
    <View style={[styles.block, { flex: 1 }]}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <PressableScale
        onPress={() => native.open(hhmmToDate(value), { title: label })}
        style={[styles.compact, { borderColor: theme.colors.line, backgroundColor: theme.colors.surface }]}
      >
        <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.primary} />
        <Text style={[styles.compactText, { color: theme.colors.text }]}>{formatTime(value)}</Text>
      </PressableScale>
      {native.iosSheet}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Duración                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_PRESETS = [15, 30, 45, 60, 90, 120];

/** Duración con stepper (±5 min, mantener presionado no requerido) y atajos. */
export function DurationField({
  label = "Duración",
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  step = 5,
  min = 5,
  max = 600,
}: {
  label?: string;
  value: number;
  onChange: (min: number) => void;
  presets?: number[];
  step?: number;
  min?: number;
  max?: number;
}) {
  const theme = useTheme();
  const safe = Number.isFinite(value) && value > 0 ? value : min;
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <View style={[styles.stepper, { borderColor: theme.colors.line, backgroundColor: theme.colors.surface }]}>
        <PressableScale
          feedback="select"
          scaleTo={0.85}
          disabled={safe <= min}
          onPress={() => set(safe - step)}
          style={[styles.stepBtn, { backgroundColor: theme.colors.sunken, opacity: safe <= min ? 0.4 : 1 }]}
          accessibilityLabel={`Restar ${step} minutos`}
        >
          <MaterialCommunityIcons name="minus" size={20} color={theme.colors.text} />
        </PressableScale>
        <Animated.Text
          key={safe}
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(80)}
          style={[styles.stepValue, { color: theme.colors.text }]}
        >
          {formatDuration(safe)}
        </Animated.Text>
        <PressableScale
          feedback="select"
          scaleTo={0.85}
          disabled={safe >= max}
          onPress={() => set(safe + step)}
          style={[styles.stepBtn, { backgroundColor: theme.colors.sunken, opacity: safe >= max ? 0.4 : 1 }]}
          accessibilityLabel={`Sumar ${step} minutos`}
        >
          <MaterialCommunityIcons name="plus" size={20} color={theme.colors.text} />
        </PressableScale>
      </View>
      <Animated.View layout={LinearTransition} style={styles.chipWrap}>
        {presets.map((p) => (
          <Chip key={p} label={formatDuration(p)} active={p === safe} onPress={() => set(p)} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10, marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontSize: 13, fontWeight: "600" },
  value: { fontSize: 20, fontWeight: "700", marginTop: 2 },
  caption: { fontSize: 12, marginTop: 2 },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerActionText: { fontSize: 13, fontWeight: "700" },
  day: {
    width: DAY_W,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 2,
  },
  dayWeek: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  dayNum: { fontSize: 20, fontWeight: "800" },
  dayMonth: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  slotRow: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  compact: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compactText: { fontSize: 15, fontWeight: "600" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
  },
  stepBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepValue: { fontSize: 20, fontWeight: "800" },
});
