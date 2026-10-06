"use client";

import { useId, useState, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { CloseIcon } from "../_internal/icons";
import { Field, fieldMessageId, fieldStyles as s, resolveStatus, type FieldStatusProps } from "../Field/Field";
import { Popover } from "../Popover/Popover";
import { Calendar } from "./Calendar";
import { addDays, formatDate, startOfDay, toISODate, type DateRange } from "./date-utils";
import styles from "./DatePicker.module.css";

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="4" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export type DatePreset = { label: string; range: () => DateRange };

/** Presets prontos para o modo range */
export const defaultRangePresets: DatePreset[] = [
  { label: "Hoje", range: () => ({ from: startOfDay(new Date()), to: startOfDay(new Date()) }) },
  { label: "Últimos 7 dias", range: () => ({ from: addDays(startOfDay(new Date()), -6), to: startOfDay(new Date()) }) },
  { label: "Últimos 30 dias", range: () => ({ from: addDays(startOfDay(new Date()), -29), to: startOfDay(new Date()) }) },
  {
    label: "Este mês",
    range: () => {
      const n = new Date();
      return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth() + 1, 0) };
    },
  },
];

type BaseProps = FieldStatusProps & {
  label?: ReactNode;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  min?: Date;
  max?: Date;
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  weekStartsOn?: 0 | 1;
  /** Formato exibido no campo */
  formatOptions?: Intl.DateTimeFormatOptions;
  disabled?: boolean;
  required?: boolean;
  optional?: boolean;
  clearable?: boolean;
  /** Gera <input type="hidden"> com a data em ISO (yyyy-mm-dd) */
  name?: string;
  id?: string;
  className?: string;
};

export type DatePickerProps =
  | (BaseProps & {
      mode?: "single";
      value?: Date | null;
      defaultValue?: Date | null;
      onValueChange?: (date: Date | null) => void;
    })
  | (BaseProps & {
      mode: "range";
      value?: DateRange;
      defaultValue?: DateRange;
      onValueChange?: (range: DateRange) => void;
      /** Atalhos à esquerda do calendário. Padrão: defaultRangePresets */
      presets?: DatePreset[] | false;
    });

export function DatePicker(props: DatePickerProps) {
  const {
    label,
    placeholder,
    size = "md",
    min,
    max,
    isDateDisabled,
    locale = "pt-BR",
    weekStartsOn = 0,
    formatOptions,
    disabled,
    required,
    optional,
    clearable = true,
    name,
    id: idProp,
    hint,
    error,
    success,
    className,
  } = props;
  const isRange = props.mode === "range";
  const autoId = useId();
  const id = idProp ?? autoId;
  const [open, setOpen] = useState(false);
  const { invalid, valid, hasMessage } = resolveStatus({ error, success, hint });

  const emptyRange: DateRange = { from: null, to: null };
  const [value, setValue] = useControllableState<Date | null | DateRange>(
    props.value,
    props.defaultValue ?? (isRange ? emptyRange : null),
    props.onValueChange as (v: Date | null | DateRange) => void,
  );

  const single = !isRange ? (value as Date | null) : null;
  const range = isRange ? ((value as DateRange) ?? emptyRange) : emptyRange;
  const presetsProp = isRange ? (props as { presets?: DatePreset[] | false }).presets : false;
  const presets = presetsProp === false ? [] : (presetsProp ?? defaultRangePresets);

  const fmt = (d: Date | null) => formatDate(d, locale, formatOptions);
  const display = isRange
    ? range.from
      ? `${fmt(range.from)} – ${range.to ? fmt(range.to) : "..."}`
      : ""
    : fmt(single);
  const hasValue = isRange ? Boolean(range.from) : Boolean(single);

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      success={success}
      required={required}
      optional={optional}
      className={className}
    >
      <div
        className={cx(s.control, styles.control)}
        data-size={size}
        data-invalid={invalid}
        data-success={valid}
        data-disabled={disabled}
        data-open={open}
      >
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom-start"
          label={typeof label === "string" ? label : "Escolher data"}
          className={styles.panel}
          trigger={(p) => (
            <button
              {...p}
              id={id}
              type="button"
              className={styles.trigger}
              disabled={disabled}
              aria-describedby={hasMessage ? fieldMessageId(id) : undefined}
            >
              <span className={cx(s.adornment, s.adornmentStart, styles.icon)}>
                <CalendarIcon />
              </span>
              <span className={cx(styles.text, !hasValue && styles.placeholder)}>
                {display || placeholder || (isRange ? "Selecione o período" : "Selecione uma data")}
              </span>
            </button>
          )}
        >
          <div className={styles.content}>
            {presets.length > 0 && (
              <div className={styles.presets}>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={styles.preset}
                    onClick={() => {
                      setValue(p.range());
                      setOpen(false);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.calendarWrap}>
              {isRange ? (
                <Calendar
                  mode="range"
                  autoFocus
                  value={range}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  weekStartsOn={weekStartsOn}
                  onChange={(r) => {
                    setValue(r);
                    if (r.from && r.to) setTimeout(() => setOpen(false), 180);
                  }}
                />
              ) : (
                <Calendar
                  autoFocus
                  value={single}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  weekStartsOn={weekStartsOn}
                  onChange={(d) => {
                    setValue(d);
                    setTimeout(() => setOpen(false), 150);
                  }}
                />
              )}
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.footerButton}
                  onClick={() => {
                    const t = startOfDay(new Date());
                    setValue(isRange ? { from: t, to: t } : t);
                    setOpen(false);
                  }}
                >
                  Hoje
                </button>
                {hasValue && (
                  <button
                    type="button"
                    className={styles.footerButton}
                    data-muted
                    onClick={() => setValue(isRange ? emptyRange : null)}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </Popover>

        {clearable && hasValue && !disabled && (
          <button
            type="button"
            className={cx(s.inlineAction, s.clearAppear)}
            aria-label="Limpar data"
            onClick={() => setValue(isRange ? emptyRange : null)}
          >
            <CloseIcon size={14} />
          </button>
        )}

        {name && !isRange && single && <input type="hidden" name={name} value={toISODate(single)} />}
        {name && isRange && range.from && <input type="hidden" name={`${name}_from`} value={toISODate(range.from)} />}
        {name && isRange && range.to && <input type="hidden" name={`${name}_to`} value={toISODate(range.to)} />}
      </div>
    </Field>
  );
}
