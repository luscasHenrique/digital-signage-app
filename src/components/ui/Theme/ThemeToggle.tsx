"use client";

import { cx } from "../_internal/cx";
import { MonitorIcon, MoonIcon, SunIcon } from "../_internal/icons";
import { SegmentedControl } from "../SegmentedControl/SegmentedControl";
import { Tooltip } from "../Tooltip/Tooltip";
import { useTheme } from "./ThemeProvider";
import styles from "./ThemeToggle.module.css";

export type ThemeToggleProps = {
  /** "icon": botão único claro/escuro · "segmented": claro / sistema / escuro */
  variant?: "icon" | "segmented";
  /** Remove o fundo de vidro (para usar dentro de outra superfície) */
  bare?: boolean;
  className?: string;
};

export function ThemeToggle({ variant = "icon", bare = false, className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <SegmentedControl
        size="sm"
        ariaLabel="Tema"
        className={className}
        value={theme}
        onValueChange={(v) => setTheme(v as typeof theme)}
        items={[
          { value: "light", icon: <SunIcon />, ariaLabel: "Claro" },
          { value: "system", icon: <MonitorIcon />, ariaLabel: "Sistema" },
          { value: "dark", icon: <MoonIcon />, ariaLabel: "Escuro" },
        ]}
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <Tooltip content={isDark ? "Tema claro" : "Tema escuro"} placement="bottom">
      <button
        type="button"
        onClick={toggleTheme}
        className={cx(styles.toggle, bare && styles.bare, className)}
        aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
        data-theme-state={resolvedTheme}
      >
        <span className={styles.sun}>
          <SunIcon size={18} />
        </span>
        <span className={styles.moon}>
          <MoonIcon size={17} />
        </span>
      </button>
    </Tooltip>
  );
}
