"use client";

import { useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { mergeRefs } from "../_internal/dom";
import { Field, fieldMessageId, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./Checkbox.module.css";

export type CheckboxProps = Omit<ComponentProps<"input">, "type" | "size"> &
  FieldStatusProps & {
    label?: ReactNode;
    /** Texto secundário abaixo do label */
    description?: ReactNode;
    /** Estado "parcial" (ex.: selecionar todos) */
    indeterminate?: boolean;
    size?: "sm" | "md";
    containerClassName?: string;
  };

export function Checkbox({
  label,
  description,
  hint,
  error,
  success,
  indeterminate = false,
  size = "md",
  containerClassName,
  className,
  id: idProp,
  disabled,
  ref,
  ...props
}: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const { invalid, hasMessage } = resolveStatus({ error, success, hint });

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <Field id={id} hint={hint} error={error} success={success} className={containerClassName}>
      <label
        className={cx(styles.root, className)}
        data-size={size}
        data-disabled={disabled}
        data-invalid={invalid}
        htmlFor={id}
      >
        <span className={styles.control}>
          <input
            ref={mergeRefs(ref, inputRef)}
            id={id}
            type="checkbox"
            className={styles.input}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
            data-indeterminate={indeterminate}
            {...props}
          />
          <span className={styles.box} aria-hidden="true">
            <svg viewBox="0 0 16 16" className={styles.check}>
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
            <svg viewBox="0 0 16 16" className={styles.dash}>
              <path d="M4 8h8" />
            </svg>
          </span>
        </span>
        {(label || description) && (
          <span className={styles.text}>
            {label && <span className={styles.label}>{label}</span>}
            {description && <span className={styles.description}>{description}</span>}
          </span>
        )}
      </label>
    </Field>
  );
}
