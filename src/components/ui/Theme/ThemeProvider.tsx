"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  readPreference,
  readResolved,
  setPreference,
  subscribe,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-store";

type ThemeContextValue = {
  /** Preferência salva: light | dark | system */
  theme: ThemePreference;
  /** Tema efetivamente aplicado no <html> */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const resolvedTheme = useSyncExternalStore(subscribe, readResolved, () => "light" as const);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: setPreference,
      toggleTheme: () => setPreference(resolvedTheme === "dark" ? "light" : "dark"),
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>.");
  return ctx;
}
