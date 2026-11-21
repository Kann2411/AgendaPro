import { createContext, useContext } from "react";
import type { Business } from "@/domain/types";

export type ColorMode = "light" | "dark";

export type Theme = {
  mode: ColorMode;
  colors: {
    background: string;
    surface: string;
    sunken: string;
    line: string;
    divider: string;
    backdrop: string;
    text: string;
    muted: string;
    faint: string;
    primary: string;
    primaryFg: string;
    primarySoft: string;
    secondary: string;
    danger: string;
    dangerSoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
  };
  radius: { sm: number; md: number; lg: number; xl: number };
  space: (n: number) => number;
};

const lightColors: Theme["colors"] = {
  background: "#f5f6f3",
  surface: "#ffffff",
  sunken: "#eceee9",
  line: "#dfe3dc",
  divider: "rgba(0,0,0,0.05)",
  backdrop: "rgba(12,20,15,0.45)",
  text: "#1c241f",
  muted: "#5d6a61",
  faint: "#8b968d",
  primary: "#1f4d40",
  primaryFg: "#f7faf8",
  primarySoft: "#dbe9e3",
  secondary: "#8d6a3f",
  danger: "#a63b32",
  dangerSoft: "#f6dcda",
  success: "#237a52",
  successSoft: "#dcefe5",
  warning: "#a8731c",
  warningSoft: "#f6ead1",
};

const darkColors: Theme["colors"] = {
  background: "#111613",
  surface: "#1a211d",
  sunken: "#232b26",
  line: "#2e3832",
  divider: "rgba(255,255,255,0.06)",
  backdrop: "rgba(0,0,0,0.6)",
  text: "#e8ede9",
  muted: "#a3b0a7",
  faint: "#76837a",
  primary: "#5fae92",
  primaryFg: "#0d1a14",
  primarySoft: "#21372e",
  secondary: "#c49a68",
  danger: "#e07a70",
  dangerSoft: "#3a2220",
  success: "#5cc08f",
  successSoft: "#1d3428",
  warning: "#e0aa55",
  warningSoft: "#3a2f1b",
};

const shared = {
  radius: { sm: 8, md: 12, lg: 16, xl: 22 },
  space: (n: number) => n * 4,
};

export const baseTheme: Theme = { mode: "light", colors: lightColors, ...shared };
export const darkTheme: Theme = { mode: "dark", colors: darkColors, ...shared };

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length !== 6) return 0;
  const r = Number.parseInt(c.slice(0, 2), 16);
  const g = Number.parseInt(c.slice(2, 4), 16);
  const b = Number.parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** Resuelve la preferencia del negocio ("light" | "dark" | "system") contra el esquema del sistema. */
export function resolveColorMode(
  preference: Business["theme"] | undefined,
  system: string | null | undefined,
): ColorMode {
  if (preference === "dark") return "dark";
  if (preference === "system") return system === "dark" ? "dark" : "light";
  return "light";
}

export function themeFromBusiness(
  business: Business | null | undefined,
  system?: string | null,
): Theme {
  const base = resolveColorMode(business?.theme, system) === "dark" ? darkTheme : baseTheme;
  if (!business) return base;
  // En modo oscuro se conserva el primario de la paleta oscura si el color
  // de marca es demasiado oscuro para leerse sobre fondos oscuros.
  const brand = business.colorPrimary || base.colors.primary;
  const primary = base.mode === "dark" && luminance(brand) < 90 ? base.colors.primary : brand;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary,
      primaryFg: luminance(primary) > 160 ? "#14231c" : "#ffffff",
      secondary: business.colorSecondary || base.colors.secondary,
    },
  };
}

export const ThemeContext = createContext<Theme>(baseTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
