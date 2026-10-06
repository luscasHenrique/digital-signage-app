"use client";

import { useId, useRef, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { Field, fieldMessageId, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./OTPInput.module.css";

export type OTPInputProps = FieldStatusProps & {
  label?: ReactNode;
  /** Quantidade de dígitos. Padrão: 6 */
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Chamado quando todos os dígitos forem preenchidos */
  onComplete?: (value: string) => void;
  /** Apenas números (padrão) ou alfanumérico */
  mode?: "numeric" | "alphanumeric";
  /** Oculta os caracteres como senha */
  mask?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Insere um separador visual no meio (ex.: 123 – 456) */
  groupSize?: number;
  className?: string;
};

export function OTPInput({
  label,
  length = 6,
  value,
  defaultValue = "",
  onChange,
  onComplete,
  mode = "numeric",
  mask = false,
  disabled,
  autoFocus,
  groupSize,
  hint,
  error,
  success,
  className,
}: OTPInputProps) {
  const id = useId();
  const [current, setCurrent] = useControllableState(value, defaultValue, onChange);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });
  const pattern = mode === "numeric" ? /[^0-9]/g : /[^a-zA-Z0-9]/g;

  // Posições vazias são guardadas como espaço para os dígitos não se deslocarem
  const chars = Array.from({ length }, (_, i) => (current[i] ?? "").trim());

  const commit = (arr: string[]) => {
    const next = arr
      .slice(0, length)
      .map((c) => c || " ")
      .join("")
      .trimEnd();
    setCurrent(next);
    if (next.length === length && !next.includes(" ")) onComplete?.(next);
  };

  const focusAt = (index: number) => {
    const el = refs.current[Math.max(0, Math.min(index, length - 1))];
    el?.focus();
    el?.select();
  };

  const handleInput = (index: number, raw: string) => {
    let typed = raw.replace(pattern, "");
    // Digitou por cima de um dígito existente: substitui em vez de empurrar
    if (chars[index] && typed.length === 2 && typed.startsWith(chars[index])) typed = typed.slice(1);
    if (!typed) return;
    const arr = [...chars];
    // Suporta autofill/paste de vários caracteres num único campo
    for (let i = 0; i < typed.length && index + i < length; i++) arr[index + i] = typed[i];
    commit(arr);
    focusAt(index + typed.length);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const arr = [...chars];
      if (arr[index]) {
        arr[index] = "";
        commit(arr);
      } else if (index > 0) {
        arr[index - 1] = "";
        commit(arr);
        focusAt(index - 1);
      }
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text").replace(pattern, "").slice(0, length);
    if (!text) return;
    commit(text.split(""));
    focusAt(text.length);
  };

  return (
    <Field id={`${id}-0`} label={label} hint={hint} error={error} success={success} className={className}>
      <div
        className={styles.root}
        role="group"
        aria-describedby={hasMessage ? fieldMessageId(`${id}-0`) : undefined}
        data-invalid={invalid}
        data-success={valid}
      >
        {chars.map((char, i) => (
          <span key={i} className={styles.slotWrap}>
            {groupSize && i > 0 && i % groupSize === 0 && <span className={styles.separator} aria-hidden="true" />}
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${id}-${i}`}
              className={cx(styles.slot, char && styles.filled)}
              type={mask ? "password" : "text"}
              inputMode={mode === "numeric" ? "numeric" : "text"}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={length}
              value={char}
              disabled={disabled}
              autoFocus={autoFocus && i === 0}
              aria-label={`Dígito ${i + 1} de ${length}`}
              aria-invalid={invalid || undefined}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
            />
          </span>
        ))}
      </div>
    </Field>
  );
}
