import type { ReactNode } from "react";
import { cx } from "../_internal/cx";
import styles from "./Badge.module.css";

export type BadgeProps = {
  children?: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  /** "solid" para contadores, "soft" para etiquetas */
  variant?: "solid" | "soft";
  /** Apenas um ponto, sem conteúdo */
  dot?: boolean;
  className?: string;
};

export function Badge({ children, tone = "neutral", variant = "soft", dot, className }: BadgeProps) {
  return (
    <span className={cx(styles.badge, dot && styles.dot, className)} data-tone={tone} data-variant={variant}>
      {!dot && children}
    </span>
  );
}

/** Formata contadores: 0 → null, 120 → "99+" */
export function formatCount(count: number, max = 99) {
  if (count <= 0) return null;
  return count > max ? `${max}+` : String(count);
}
