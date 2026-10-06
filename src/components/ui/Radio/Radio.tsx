"use client";

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { Field, fieldMessageId, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./Radio.module.css";

type RadioContextValue = {
  name: string;
  value: string;
  setValue: (v: string) => void;
  disabled?: boolean;
  invalid: boolean;
  variant: "default" | "card";
};

const RadioContext = createContext<RadioContextValue | null>(null);

export type RadioGroupProps = FieldStatusProps & {
  label?: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "vertical" | "horizontal";
  /** "card" transforma cada opção num cartão de vidro selecionável */
  variant?: "default" | "card";
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function RadioGroup({
  label,
  name,
  value,
  defaultValue = "",
  onValueChange,
  orientation = "vertical",
  variant = "default",
  disabled,
  required,
  hint,
  error,
  success,
  className,
  children,
}: RadioGroupProps) {
  const autoId = useId();
  const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange);
  const { invalid, hasMessage } = resolveStatus({ error, success, hint });

  return (
    <Field id={autoId} hint={hint} error={error} success={success} className={className}>
      <div
        role="radiogroup"
        aria-labelledby={label ? `${autoId}-label` : undefined}
        aria-describedby={hasMessage ? fieldMessageId(autoId) : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        className={styles.group}
      >
        {label && (
          <span id={`${autoId}-label`} className={styles.groupLabel}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </span>
        )}
        <div className={cx(styles.options, styles[orientation], variant === "card" && styles.cards)}>
          <RadioContext.Provider
            value={{ name: name ?? autoId, value: current, setValue: setCurrent, disabled, invalid, variant }}
          >
            {children}
          </RadioContext.Provider>
        </div>
      </div>
    </Field>
  );
}

export type RadioProps = Omit<ComponentProps<"input">, "type" | "name" | "checked" | "onChange"> & {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
  /** Ícone (útil na variante card) */
  icon?: ReactNode;
};

export function Radio({ value, label, description, icon, disabled, className, id: idProp, ...props }: RadioProps) {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("<Radio> precisa estar dentro de <RadioGroup>.");
  const autoId = useId();
  const id = idProp ?? autoId;
  const isDisabled = disabled ?? ctx.disabled;
  const checked = ctx.value === value;

  return (
    <label
      htmlFor={id}
      className={cx(styles.root, ctx.variant === "card" && styles.card, className)}
      data-disabled={isDisabled}
      data-checked={checked}
      data-invalid={ctx.invalid}
    >
      <span className={styles.control}>
        <input
          id={id}
          type="radio"
          name={ctx.name}
          value={value}
          checked={checked}
          disabled={isDisabled}
          onChange={() => ctx.setValue(value)}
          className={styles.input}
          {...props}
        />
        <span className={styles.circle} aria-hidden="true" />
      </span>
      {icon && <span className={styles.icon}>{icon}</span>}
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </span>
      )}
    </label>
  );
}
