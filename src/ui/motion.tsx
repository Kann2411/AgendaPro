import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "./haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

export type PressableScaleProps = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar (1 = sin efecto). */
  scaleTo?: number;
  /** Tipo de vibración al tocar; `false` para desactivarla. */
  feedback?: "tap" | "select" | false;
};

/**
 * Pressable con micro-interacción: se encoge con un resorte al presionar,
 * baja levemente la opacidad y emite una vibración sutil.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  feedback = "tap",
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }],
    opacity: 1 - 0.12 * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = withSpring(1, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: 160 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback) haptic[feedback]();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
