"use client";

import { createContext, useContext, type ComponentPropsWithRef, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import type { ResolvedTheme } from "./theme-store";
import styles from "./ThemeScope.module.css";

const ThemeScopeContext = createContext<ResolvedTheme | null>(null);

/** Tema forçado pelo <ThemeScope> mais próximo (null = segue o <html>). */
export function useThemeScope() {
  return useContext(ThemeScopeContext);
}

export type ThemeScopeProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** Tema forçado neste trecho. `undefined` = herda o tema da página. */
  theme?: ResolvedTheme;
  children?: ReactNode;
};

/**
 * Força um tema em uma região da página (ex.: sidebar sempre escura, preview).
 * Overlays abertos lá dentro (Dialog, Popover, Select, Tooltip…) também herdam o tema,
 * mesmo sendo renderizados em Portal no <body>.
 */
export function ThemeScope({ theme, className, children, ...rest }: ThemeScopeProps) {
  return (
    <ThemeScopeContext.Provider value={theme ?? null}>
      <div {...rest} data-theme={theme} className={cx(theme && styles.scope, className)}>
        {children}
      </div>
    </ThemeScopeContext.Provider>
  );
}

/** Uso interno do Portal: reaplica o tema do escopo sem criar caixa de layout. */
export function PortalThemeScope({ children }: { children: ReactNode }) {
  const theme = useThemeScope();
  if (!theme) return children;
  return (
    <div data-theme={theme} className={cx(styles.scope, styles.contents)}>
      {children}
    </div>
  );
}
