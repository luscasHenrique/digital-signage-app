"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState, useIsomorphicLayoutEffect } from "../_internal/hooks";
import styles from "./SegmentedControl.module.css";

export type SegmentedItem = {
  value: string;
  label?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  /** Necessário quando só há ícone */
  ariaLabel?: string;
};

export type SegmentedControlProps = {
  items: SegmentedItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md" | "lg";
  /** Conteúdo extra no fim da pílula, após um divisor (ex.: ThemeToggle) */
  trailing?: ReactNode;
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
};

/** Pílula de vidro com indicador deslizante — a navegação da referência Liquid Glass. */
export function SegmentedControl({
  items,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  trailing,
  fullWidth,
  ariaLabel,
  className,
}: SegmentedControlProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue ?? items[0]?.value ?? "", onValueChange);
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number; ready: boolean }>({ x: 0, w: 0, ready: false });

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) return;
      setIndicator((prev) => ({ x: active.offsetLeft, w: active.offsetWidth, ready: prev.ready }));
    };
    measure();
    // Só liga a transição depois da primeira medida (sem "deslizar" ao montar)
    const raf = requestAnimationFrame(() => setIndicator((prev) => (prev.ready ? prev : { ...prev, ready: true })));
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [current, items.length]);

  const enabled = items.filter((i) => !i.disabled);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const idx = enabled.findIndex((i) => i.value === current);
    let next = idx;
    if (event.key === "ArrowRight") next = (idx + 1) % enabled.length;
    if (event.key === "ArrowLeft") next = (idx - 1 + enabled.length) % enabled.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = enabled.length - 1;
    const item = enabled[next];
    if (!item) return;
    setCurrent(item.value);
    listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(item.value)}"]`)?.focus();
  };

  return (
    <div className={cx(styles.root, fullWidth && styles.fullWidth, className)} data-size={size}>
      <div ref={listRef} role="radiogroup" aria-label={ariaLabel} className={styles.list} onKeyDown={onKeyDown}>
        <span
          className={styles.indicator}
          data-ready={indicator.ready}
          style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }}
          aria-hidden="true"
        />
        {items.map((item) => {
          const active = item.value === current;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={item.ariaLabel}
              tabIndex={active ? 0 : -1}
              disabled={item.disabled}
              data-active={active}
              data-value={item.value}
              className={styles.item}
              onClick={() => setCurrent(item.value)}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              {item.label && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>
      {trailing && (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <div className={styles.trailing}>{trailing}</div>
        </>
      )}
    </div>
  );
}
