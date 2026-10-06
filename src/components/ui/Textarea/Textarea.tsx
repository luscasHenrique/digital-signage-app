"use client";

import { useId, useRef, useState, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { mergeRefs } from "../_internal/dom";
import { useIsomorphicLayoutEffect } from "../_internal/hooks";
import { Field, fieldMessageId, fieldStyles as s, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./Textarea.module.css";

export type TextareaProps = ComponentProps<"textarea"> &
  FieldStatusProps & {
    label?: ReactNode;
    optional?: boolean;
    /** Cresce automaticamente com o conteúdo */
    autoResize?: boolean;
    /** Altura máxima (px) quando autoResize */
    maxHeight?: number;
    /** Mostra contador de caracteres */
    showCount?: boolean;
    containerClassName?: string;
  };

export function Textarea({
  label,
  hint,
  error,
  success,
  optional,
  autoResize = true,
  maxHeight = 320,
  showCount,
  containerClassName,
  className,
  id: idProp,
  required,
  disabled,
  value,
  defaultValue,
  onChange,
  maxLength,
  rows = 3,
  ref,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const [innerValue, setInnerValue] = useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : innerValue;
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });

  useIsomorphicLayoutEffect(() => {
    const el = innerRef.current;
    if (!autoResize || !el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [current, autoResize, maxHeight]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (value === undefined) setInnerValue(event.target.value);
    onChange?.(event);
  };

  const nearLimit = maxLength ? current.length / maxLength >= 0.9 : false;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      success={success}
      required={required}
      optional={optional}
      className={containerClassName}
      meta={
        showCount ? (
          <span className={cx(nearLimit && styles.nearLimit)}>
            {current.length}
            {maxLength ? `/${maxLength}` : ""}
          </span>
        ) : undefined
      }
    >
      <div
        className={cx(s.control, styles.control, className)}
        data-invalid={invalid}
        data-success={valid}
        data-disabled={disabled}
      >
        <textarea
          ref={mergeRefs(ref, innerRef)}
          id={id}
          rows={rows}
          className={cx(s.input, styles.textarea)}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...props}
        />
      </div>
    </Field>
  );
}
