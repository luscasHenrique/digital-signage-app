"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "../_internal/cx";
import { ChevronLeftIcon, ChevronRightIcon } from "../_internal/icons";
import {
  addDays,
  addMonths,
  compareDay,
  isBetween,
  isSameDay,
  isSameMonth,
  monthMatrix,
  startOfDay,
  toISODate,
  weekdayNames,
  type DateRange,
} from "./date-utils";
import styles from "./Calendar.module.css";

type CommonProps = {
  min?: Date;
  max?: Date;
  /** Retorne true para desabilitar um dia (ex.: fins de semana) */
  isDateDisabled?: (date: Date) => boolean;
  locale?: string;
  /** 0 = domingo (padrão no Brasil), 1 = segunda */
  weekStartsOn?: 0 | 1;
  /** Mês exibido inicialmente */
  defaultMonth?: Date;
  /** Foca o dia selecionado/hoje ao montar */
  autoFocus?: boolean;
  className?: string;
};

export type CalendarProps =
  | (CommonProps & { mode?: "single"; value: Date | null; onChange: (date: Date) => void })
  | (CommonProps & { mode: "range"; value: DateRange; onChange: (range: DateRange) => void });

export function Calendar(props: CalendarProps) {
  const { min, max, isDateDisabled, locale = "pt-BR", weekStartsOn = 0, defaultMonth, autoFocus, className } = props;
  const isRange = props.mode === "range";
  const single = !isRange ? (props.value as Date | null) : null;
  const range = isRange ? (props.value as DateRange) : null;
  const anchorDate = single ?? range?.from ?? defaultMonth ?? new Date();

  const [month, setMonth] = useState(() => startOfDay(anchorDate));
  const [focusDate, setFocusDate] = useState(() => startOfDay(anchorDate));
  const [view, setView] = useState<"days" | "months">("days");
  const [hover, setHover] = useState<Date | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(Boolean(autoFocus));
  const today = startOfDay(new Date());

  const disabled = (d: Date) =>
    (min && compareDay(d, min) < 0) || (max && compareDay(d, max) > 0) || Boolean(isDateDisabled?.(d));

  useEffect(() => {
    if (!shouldFocus.current) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${toISODate(focusDate)}"]`)?.focus();
  }, [focusDate, month]);

  const goMonth = (n: number) => {
    setDirection(n > 0 ? "next" : "prev");
    setMonth((m) => addMonths(new Date(m.getFullYear(), m.getMonth(), 1), n));
  };

  const moveFocus = (d: Date) => {
    shouldFocus.current = true;
    setFocusDate(d);
    if (!isSameMonth(d, month)) {
      setDirection(compareDay(d, month) > 0 ? "next" : "prev");
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const select = (d: Date) => {
    if (disabled(d)) return;
    if (!isRange) {
      (props.onChange as (d: Date) => void)(d);
      return;
    }
    const onRange = props.onChange as (r: DateRange) => void;
    if (!range?.from || range.to || compareDay(d, range.from) < 0) onRange({ from: d, to: null });
    else onRange({ from: range.from, to: d });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusDate, -1),
      ArrowRight: () => addDays(focusDate, 1),
      ArrowUp: () => addDays(focusDate, -7),
      ArrowDown: () => addDays(focusDate, 7),
      PageUp: () => addMonths(focusDate, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDate, e.shiftKey ? 12 : 1),
      Home: () => addDays(focusDate, -((focusDate.getDay() - weekStartsOn + 7) % 7)),
      End: () => addDays(focusDate, 6 - ((focusDate.getDay() - weekStartsOn + 7) % 7)),
    };
    if (map[e.key]) {
      e.preventDefault();
      moveFocus(map[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(focusDate);
    }
  };

  const days = monthMatrix(month, weekStartsOn);
  const rawTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);
  const title = rawTitle.charAt(0).toLocaleUpperCase(locale) + rawTitle.slice(1);
  const rangeEnd = range?.to ?? (range?.from && hover && compareDay(hover, range.from) >= 0 ? hover : null);

  return (
    <div className={cx(styles.calendar, className)}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.title}
          onClick={() => setView(view === "days" ? "months" : "days")}
          aria-label={view === "days" ? "Escolher mês e ano" : "Voltar aos dias"}
        >
          <span>{view === "days" ? title : month.getFullYear()}</span>
          <ChevronRightIcon size={14} className={styles.titleChevron} data-open={view === "months"} />
        </button>
        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => (view === "days" ? goMonth(-1) : setMonth((m) => addMonths(m, -12)))}
            aria-label={view === "days" ? "Mês anterior" : "Ano anterior"}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => (view === "days" ? goMonth(1) : setMonth((m) => addMonths(m, 12)))}
            aria-label={view === "days" ? "Próximo mês" : "Próximo ano"}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      {view === "months" ? (
        <div className={styles.months}>
          {Array.from({ length: 12 }, (_, i) => {
            const m = new Date(month.getFullYear(), i, 1);
            const current = i === month.getMonth();
            return (
              <button
                key={i}
                type="button"
                className={styles.monthCell}
                data-selected={current}
                onClick={() => {
                  setMonth(m);
                  setFocusDate(new Date(m.getFullYear(), m.getMonth(), Math.min(focusDate.getDate(), 28)));
                  setView("days");
                }}
              >
                {new Intl.DateTimeFormat(locale, { month: "short" }).format(m).replace(".", "")}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className={styles.weekdays} aria-hidden="true">
            {weekdayNames(locale, weekStartsOn).map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div
            ref={gridRef}
            key={`${month.getFullYear()}-${month.getMonth()}`}
            role="grid"
            aria-label={title}
            className={styles.grid}
            data-direction={direction}
            onKeyDown={onKeyDown}
            onPointerLeave={() => setHover(null)}
          >
            {days.map((d) => {
              const outside = !isSameMonth(d, month);
              const isDisabled = disabled(d);
              const selected = isRange
                ? isSameDay(d, range?.from) || isSameDay(d, range?.to)
                : isSameDay(d, single);
              const inRange =
                isRange && range?.from && rangeEnd ? isBetween(d, range.from, rangeEnd) : false;
              const rangeStart = isRange && isSameDay(d, range?.from) && Boolean(rangeEnd);
              const rangeFinish = isRange && rangeEnd && isSameDay(d, rangeEnd);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  role="gridcell"
                  data-date={toISODate(d)}
                  tabIndex={isSameDay(d, focusDate) ? 0 : -1}
                  aria-selected={selected || inRange || undefined}
                  aria-disabled={isDisabled || undefined}
                  aria-current={isSameDay(d, today) ? "date" : undefined}
                  aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(d)}
                  className={styles.day}
                  data-outside={outside}
                  data-selected={selected}
                  data-in-range={inRange && !selected}
                  data-range-start={rangeStart}
                  data-range-end={Boolean(rangeFinish) && !isSameDay(range?.from, rangeEnd)}
                  data-today={isSameDay(d, today)}
                  onClick={() => {
                    setFocusDate(d);
                    select(d);
                  }}
                  onPointerEnter={() => isRange && setHover(d)}
                >
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
