"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import styles from "./Switch.module.css";

export type SwitchProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md";
  /** Cor quando ligado */
  tone?: "accent" | "success";
  /** Posição do label */
  labelPosition?: "start" | "end";
  containerClassName?: string;
};

/** Toggle no estilo iOS — o knob "estica" ao pressionar. */
export function Switch({
  label,
  description,
  size = "md",
  tone = "accent",
  labelPosition = "end",
  containerClassName,
  className,
  id: idProp,
  disabled,
  ...props
}: SwitchProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  return (
    <label
      htmlFor={id}
      className={cx(styles.root, labelPosition === "start" && styles.reverse, containerClassName)}
      data-size={size}
      data-tone={tone}
      data-disabled={disabled}
    >
      <span className={cx(styles.track, className)}>
        <input id={id} type="checkbox" role="switch" className={styles.input} disabled={disabled} {...props} />
        <span className={styles.knob} aria-hidden="true" />
      </span>
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </span>
      )}
    </label>
  );
}
