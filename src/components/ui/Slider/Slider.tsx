"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { Field, fieldMessageId, resolveStatus, type FieldStatusProps } from "../Field/Field";
import styles from "./Slider.module.css";

type SliderValue = number | [number, number];

export type SliderProps<V extends SliderValue = SliderValue> = FieldStatusProps & {
  label?: ReactNode;
  /** Número (simples) ou [min, max] (intervalo) */
  value?: V;
  defaultValue?: V;
  /** Durante o arraste */
  onValueChange?: (value: V) => void;
  /** Ao soltar o arraste / tecla */
  onValueCommit?: (value: V) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Marcas no trilho. Números ou { value, label } */
  marks?: Array<number | { value: number; label?: ReactNode }>;
  /** Balão com o valor: ao interagir (padrão), sempre ou nunca */
  showValue?: "auto" | "always" | "never";
  /** Formata o valor exibido (balão, aria-valuetext e cabeçalho) */
  formatValue?: (value: number) => string;
  /** Mostra o valor atual à direita do label */
  showValueInLabel?: boolean;
  /** Ícones nas pontas (ex.: volume baixo/alto) */
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  name?: string;
  className?: string;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export function Slider<V extends SliderValue = SliderValue>({
  label,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min = 0,
  max = 100,
  step = 1,
  marks,
  showValue = "auto",
  formatValue = (v) => String(v),
  showValueInLabel = false,
  startIcon,
  endIcon,
  size = "md",
  disabled,
  name,
  hint,
  error,
  success,
  className,
}: SliderProps<V>) {
  const id = useId();
  const isRange = Array.isArray(value ?? defaultValue);
  const toArray = (v: SliderValue | undefined): number[] =>
    v === undefined ? (isRange ? [min, max] : [min]) : Array.isArray(v) ? [...v] : [v];
  const fromArray = (arr: number[]) => (isRange ? [arr[0], arr[1]] : arr[0]) as V;

  const [current, setCurrent] = useControllableState<V>(
    value,
    (defaultValue ?? (isRange ? [min, max] : min)) as V,
    onValueChange,
  );
  const values = toArray(current);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const { invalid, hasMessage } = resolveStatus({ error, success, hint });

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const decimals = (String(step).split(".")[1] ?? "").length;
  const snap = (v: number) => Number((Math.round((v - min) / step) * step + min).toFixed(decimals));

  const setThumb = (index: number, raw: number) => {
    const next = [...values];
    let v = clamp(snap(raw), min, max);
    // Impede que os polegares se cruzem no modo intervalo
    if (isRange) v = index === 0 ? Math.min(v, next[1]) : Math.max(v, next[0]);
    if (next[index] === v) return next;
    next[index] = v;
    setCurrent(fromArray(next));
    return next;
  };

  const valueFromPointer = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return min + clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    e.preventDefault();
    const v = valueFromPointer(e.clientX);
    const index = isRange ? (Math.abs(v - values[0]) <= Math.abs(v - values[1]) ? 0 : 1) : 0;
    setActive(index);
    setThumb(index, v);
    e.currentTarget.setPointerCapture(e.pointerId);
    trackRef.current?.querySelectorAll<HTMLElement>('[role="slider"]')[index]?.focus();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (active === null) return;
    setThumb(active, valueFromPointer(e.clientX));
  };

  const onPointerUp = () => {
    if (active === null) return;
    setActive(null);
    onValueCommit?.(current);
  };

  const onKeyDown = (index: number, e: KeyboardEvent) => {
    const big = Math.max(step, (max - min) / 10);
    const map: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
    };
    let next: number | undefined;
    if (e.key in map) next = values[index] + map[e.key];
    if (e.key === "Home") next = min;
    if (e.key === "End") next = max;
    if (next === undefined) return;
    e.preventDefault();
    const arr = setThumb(index, next);
    onValueCommit?.(fromArray(arr));
  };

  const fillStart = isRange ? pct(values[0]) : 0;
  const fillEnd = pct(isRange ? values[1] : values[0]);
  const display = values.map(formatValue).join(" – ");
  const normalizedMarks = marks?.map((m) => (typeof m === "number" ? { value: m } : m));
  const hasMarkLabels = normalizedMarks?.some((m) => m.label !== undefined);

  return (
    <Field
      id={`${id}-0`}
      label={label}
      labelAction={showValueInLabel ? <span className={styles.labelValue}>{display}</span> : undefined}
      hint={hint}
      error={error}
      success={success}
      className={className}
    >
      <div className={styles.root} data-size={size} data-disabled={disabled} data-invalid={invalid}>
        {startIcon && <span className={styles.edgeIcon}>{startIcon}</span>}
        <div className={styles.trackArea} data-marks={hasMarkLabels}>
          <div
            ref={trackRef}
            className={styles.track}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            data-dragging={active !== null}
          >
            <span className={styles.rail} />
            <span className={styles.fill} style={{ left: `${fillStart}%`, width: `${fillEnd - fillStart}%` }} />

            {normalizedMarks?.map((m) => (
              <span
                key={m.value}
                className={styles.mark}
                data-active={m.value >= (isRange ? values[0] : min) && m.value <= (isRange ? values[1] : values[0])}
                style={{ left: `${pct(m.value)}%` }}
              >
                {m.label !== undefined && <span className={styles.markLabel}>{m.label}</span>}
              </span>
            ))}

            {values.map((v, i) => {
              const showBubble =
                showValue === "always" || (showValue === "auto" && (active === i || focused === i));
              return (
                <span
                  key={i}
                  role="slider"
                  id={`${id}-${i}`}
                  tabIndex={disabled ? -1 : 0}
                  aria-valuemin={isRange && i === 1 ? values[0] : min}
                  aria-valuemax={isRange && i === 0 ? values[1] : max}
                  aria-valuenow={v}
                  aria-valuetext={formatValue(v)}
                  aria-label={isRange ? (i === 0 ? "Valor mínimo" : "Valor máximo") : undefined}
                  aria-disabled={disabled || undefined}
                  aria-invalid={invalid || undefined}
                  aria-describedby={hasMessage ? fieldMessageId(`${id}-0`) : undefined}
                  className={cx(styles.thumb, active === i && styles.thumbActive)}
                  style={{ left: `${pct(v)}%` }}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onFocus={() => setFocused(i)}
                  onBlur={() => setFocused(null)}
                >
                  <span className={styles.bubble} data-visible={showBubble}>
                    {formatValue(v)}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        {endIcon && <span className={styles.edgeIcon}>{endIcon}</span>}
        {name && values.map((v, i) => <input key={i} type="hidden" name={isRange ? `${name}[${i}]` : name} value={v} />)}
      </div>
    </Field>
  );
}
