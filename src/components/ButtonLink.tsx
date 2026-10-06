// src/components/ButtonLink.tsx
// Link do Next com a aparência do Button do Liquid Glass (o Button só renderiza <button>).
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "@/components/ui/Button/Button";
import styles from "@/components/ui/Button/Button.module.css";
import { cx } from "@/components/ui/_internal/cx";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  iconOnly,
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(
        styles.button,
        styles[variant],
        size !== "md" && styles[size],
        iconOnly && styles.iconOnly,
        fullWidth && styles.fullWidth,
        className
      )}
      {...props}
    >
      <span className={styles.label}>
        {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </span>
    </Link>
  );
}
