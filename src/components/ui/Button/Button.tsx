"use client";

import type { ComponentProps, ReactNode } from "react";
import { cx } from "../_internal/cx";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "tinted" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ícone antes do texto */
  leftIcon?: ReactNode;
  /** Ícone depois do texto */
  rightIcon?: ReactNode;
  /** Mostra spinner e desabilita o botão mantendo a largura */
  loading?: boolean;
  /** Botão quadrado/redondo apenas com ícone. Exige aria-label. */
  iconOnly?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  loading = false,
  iconOnly = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        size !== "md" && styles[size],
        iconOnly && styles.iconOnly,
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={styles.label}>
        {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </span>
      {loading && (
        <span className={styles.spinnerWrap}>
          <Spinner size={size === "lg" ? 20 : 16} />
        </span>
      )}
    </button>
  );
}
