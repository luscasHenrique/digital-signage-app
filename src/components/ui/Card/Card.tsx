import type { ComponentProps, ElementType } from "react";
import { cx } from "../_internal/cx";
import styles from "./Card.module.css";

export type CardProps = ComponentProps<"div"> & {
  /** Elemento renderizado (div, section, article...) */
  as?: ElementType;
  /** "glass" (padrão), "strong" (mais opaco, p/ leitura) ou "flat" (sem blur) */
  variant?: "glass" | "strong" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "md" | "lg" | "xl";
  /** Eleva levemente no hover (cards clicáveis) */
  interactive?: boolean;
};

/** Superfície de vidro base. Use para painéis, cards e containers. */
export function Card({
  as: Comp = "div",
  variant = "glass",
  padding = "md",
  radius = "xl",
  interactive,
  className,
  ...props
}: CardProps) {
  return (
    <Comp
      className={cx(styles.card, interactive && styles.interactive, className)}
      data-variant={variant}
      data-padding={padding}
      data-radius={radius}
      {...props}
    />
  );
}
