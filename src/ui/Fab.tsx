import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { haptic } from "./haptics";
import { PressableScale } from "./motion";
import { useTheme } from "./theme";

export type FabAction = { id: string; label: string; icon: string; onPress: () => void };

/**
 * Botón flotante con menú rápido (speed dial). Con una sola acción la ejecuta
 * directo; con varias, despliega las opciones con animación escalonada.
 */
export function Fab({ actions, bottom = 20 }: { actions: FabAction[]; bottom?: number }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSpring(open ? 1 : 0, { damping: 14, stiffness: 200 });
  }, [open, rotation]);

  // El botón "atrás" de Android cierra el menú en vez de salir de la pantalla.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value * 45}deg` }] }));

  function toggle() {
    if (actions.length === 1) {
      actions[0]!.onPress();
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <>
      {open ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Cerrar menú" />
        </Animated.View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.container, { bottom }]}>
        {open
          ? actions.map((action, index) => (
              <Animated.View
                key={action.id}
                entering={FadeInDown.delay((actions.length - 1 - index) * 40).springify().damping(16)}
                exiting={FadeOutDown.duration(120)}
                style={styles.actionRow}
              >
                <View style={[styles.label, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.labelText, { color: theme.colors.text }]}>{action.label}</Text>
                </View>
                <PressableScale
                  scaleTo={0.9}
                  onPress={() => {
                    setOpen(false);
                    action.onPress();
                  }}
                  accessibilityLabel={action.label}
                  style={[styles.mini, { backgroundColor: theme.colors.surface }]}
                >
                  <MaterialCommunityIcons name={action.icon as never} size={22} color={theme.colors.primary} />
                </PressableScale>
              </Animated.View>
            ))
          : null}

        <PressableScale
          scaleTo={0.9}
          feedback={false}
          onPress={() => {
            haptic.tap();
            toggle();
          }}
          accessibilityLabel={open ? "Cerrar acciones rápidas" : "Acciones rápidas"}
          style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
        >
          <Animated.View style={iconStyle}>
            <MaterialCommunityIcons name="plus" size={30} color={theme.colors.primaryFg} />
          </Animated.View>
        </PressableScale>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", right: 20, alignItems: "flex-end", gap: 14 },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginRight: 7 },
  label: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  labelText: { fontSize: 14, fontWeight: "700" },
  mini: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
