import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { PressableScale } from "./motion";
import { useTheme, type Theme } from "./theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
  overlay,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  /** Elementos flotantes sobre el contenido (p. ej. el FAB). */
  overlay?: ReactNode;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const content = <View style={styles.screenInner}>{children}</View>;
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, overlay ? { paddingBottom: 110 } : null]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {overlay}
    </View>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.pageTitleRow}>
      <View style={{ flex: 1 }}>
        <RNText style={styles.pageTitle}>{title}</RNText>
        {subtitle ? <RNText style={styles.pageSubtitle}>{subtitle}</RNText> : null}
      </View>
      {action}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.card, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const bg = {
    primary: theme.colors.primary,
    secondary: theme.colors.sunken,
    ghost: "transparent",
    danger: theme.colors.danger,
  }[variant];
  const fg = variant === "primary" || variant === "danger" ? theme.colors.primaryFg : theme.colors.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      scaleTo={0.96}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: variant === "secondary" ? theme.colors.line : "transparent" },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon as never} size={18} color={fg} /> : null}
          <RNText style={[styles.buttonText, { color: fg }]}>{title}</RNText>
        </>
      )}
    </PressableScale>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  size = 22,
}: {
  name: string;
  onPress?: () => void;
  color?: string;
  size?: number;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <PressableScale onPress={onPress} hitSlop={8} scaleTo={0.85} style={styles.iconButton}>
      <MaterialCommunityIcons name={name as never} size={size} color={color ?? theme.colors.muted} />
    </PressableScale>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.field}>
      <RNText style={styles.fieldLabel}>{label}</RNText>
      {children}
      {hint ? <RNText style={styles.fieldHint}>{hint}</RNText> : null}
    </View>
  );
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  editable = true,
  icon,
  prefix,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "phone-pad" | "email-address";
  multiline?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  /** Icono a la izquierda (MaterialCommunityIcons). */
  icon?: string;
  /** Texto fijo a la izquierda, p. ej. el símbolo de moneda. */
  prefix?: string;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.inputBox,
        multiline && styles.inputMultiline,
        focused && { borderColor: theme.colors.primary },
      ]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon as never}
          size={18}
          color={focused ? theme.colors.primary : theme.colors.faint}
          style={multiline ? { marginTop: 14 } : undefined}
        />
      ) : null}
      {prefix ? <RNText style={styles.inputPrefix}>{prefix}</RNText> : null}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.faint}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        editable={editable}
        selectionColor={theme.colors.primary}
        cursorColor={theme.colors.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, multiline && styles.inputTextMultiline, !editable && styles.inputDisabled]}
      />
    </View>
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const theme = useTheme();
  const bg = {
    neutral: theme.colors.sunken,
    success: theme.colors.successSoft,
    warning: theme.colors.warningSoft,
    danger: theme.colors.dangerSoft,
    primary: theme.colors.primarySoft,
  }[tone];
  const fg = {
    neutral: theme.colors.muted,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    primary: theme.colors.primary,
  }[tone];
  const styles = makeStyles(theme);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <RNText style={[styles.badgeText, { color: fg }]}>{label}</RNText>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <PressableScale
          key={option.id}
          feedback="select"
          onPress={() => onChange(option.id)}
          style={[styles.segment, value === option.id && { backgroundColor: theme.colors.primary }]}
        >
          <RNText
            style={[styles.segmentText, { color: value === option.id ? theme.colors.primaryFg : theme.colors.muted }]}
          >
            {option.label}
          </RNText>
        </PressableScale>
      ))}
    </View>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Card style={styles.empty}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={34} color={theme.colors.faint} />
      <RNText style={styles.emptyTitle}>{title}</RNText>
      {body ? <RNText style={styles.emptyBody}>{body}</RNText> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </Card>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
      <RNText style={styles.emptyBody}>{label}</RNText>
    </View>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <RNModal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrapper}
        >
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(180)} style={styles.sheet}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.colors.line }]} />
            <View style={styles.sheetHeader}>
              <RNText style={styles.sheetTitle}>{title}</RNText>
              <IconButton name="close" onPress={onClose} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </RNModal>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <Card style={styles.stat}>
      <RNText style={styles.statValue} numberOfLines={1}>
        {value}
      </RNText>
      <RNText style={styles.statLabel}>{label}</RNText>
      {tone ? <View style={[styles.statDot, { backgroundColor: tone }]} /> : null}
    </Card>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return <RNText style={styles.sectionTitle}>{children}</RNText>;
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.line, marginVertical: 12 }} />;
}

const stylesCache = new WeakMap<Theme, ReturnType<typeof StyleSheet.create>>();

function makeStyles(theme: Theme) {
  const cached = stylesCache.get(theme);
  if (cached) return cached as S;
  const created = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    screenInner: { width: "100%", maxWidth: 720, alignSelf: "center", paddingBottom: 32 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
    pageTitleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
    pageTitle: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5, color: theme.colors.text },
    pageSubtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.line,
      gap: 8,
    },
    pressed: { opacity: 0.75 },
    button: {
      minHeight: 46,
      borderRadius: theme.radius.md,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      borderWidth: 1,
    },
    buttonText: { fontSize: 15, fontWeight: "600" },
    disabled: { opacity: 0.45 },
    iconButton: { padding: 6, borderRadius: 8 },
    field: { gap: 6, marginBottom: 12 },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: theme.colors.muted },
    fieldHint: { fontSize: 12, color: theme.colors.faint },
    inputBox: {
      minHeight: 48,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.line,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: { flex: 1, minHeight: 46, color: theme.colors.text, fontSize: 15, paddingVertical: 0 },
    inputPrefix: { fontSize: 15, fontWeight: "700", color: theme.colors.muted },
    inputMultiline: { minHeight: 96, alignItems: "flex-start" },
    inputTextMultiline: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },
    inputDisabled: { color: theme.colors.faint },
    badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
    badgeText: { fontSize: 11, fontWeight: "700" },
    segmented: {
      flexDirection: "row",
      backgroundColor: theme.colors.sunken,
      borderRadius: theme.radius.md,
      padding: 4,
      gap: 4,
    },
    segment: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
    segmentText: { fontSize: 13, fontWeight: "600" },
    empty: { alignItems: "center", paddingVertical: 36, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: "700", color: theme.colors.text, marginTop: 6 },
    emptyBody: { fontSize: 13, color: theme.colors.muted, textAlign: "center", lineHeight: 19 },
    loading: { padding: 40, alignItems: "center", gap: 12 },
    modalBackdrop: { flex: 1, backgroundColor: theme.colors.backdrop, justifyContent: "flex-end" },
    sheetWrapper: { maxHeight: "90%" },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      paddingBottom: 24,
      maxHeight: "90%",
    },
    sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginTop: 10 },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 8,
    },
    sheetTitle: { fontSize: 20, fontWeight: "700", color: theme.colors.text },
    sheetBody: { paddingHorizontal: 20, paddingTop: 8, gap: 4 },
    stat: { flex: 1, minWidth: 150, gap: 2 },
    statValue: { fontSize: 22, fontWeight: "700", color: theme.colors.text },
    statLabel: { fontSize: 12, color: theme.colors.muted },
    statDot: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.colors.text, marginTop: 12, marginBottom: 4 },
  });
  stylesCache.set(theme, created);
  return created as S;
}

type S = ReturnType<typeof StyleSheet.create> & Record<string, StyleProp<ViewStyle | TextStyle>>;
