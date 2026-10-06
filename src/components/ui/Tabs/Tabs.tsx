"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState, useIsomorphicLayoutEffect } from "../_internal/hooks";
import styles from "./Tabs.module.css";

export type TabItem = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Contador ou etiqueta ao lado do label */
  badge?: ReactNode;
  disabled?: boolean;
  /** Conteúdo do painel */
  content?: ReactNode;
};

export type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** "underline" (linha deslizante) ou "pill" (pílula de vidro) */
  variant?: "underline" | "pill";
  size?: "sm" | "md";
  fullWidth?: boolean;
  /** Mantém os painéis inativos montados (preserva estado de formulários) */
  keepMounted?: boolean;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
};

export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = "underline",
  size = "md",
  fullWidth,
  keepMounted,
  ariaLabel,
  className,
  panelClassName,
}: TabsProps) {
  const id = useId();
  const [current, setCurrent] = useControllableState(value, defaultValue ?? items[0]?.value ?? "", onValueChange);
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });
  // Direção da animação do painel (esquerda/direita)
  const currentIndex = items.findIndex((i) => i.value === current);
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  if (currentIndex !== prevIndex) {
    setDirection(currentIndex > prevIndex ? "forward" : "back");
    setPrevIndex(currentIndex);
  }

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) setIndicator((p) => ({ x: el.offsetLeft, w: el.offsetWidth, ready: p.ready }));
    };
    measure();
    const raf = requestAnimationFrame(() => setIndicator((p) => (p.ready ? p : { ...p, ready: true })));
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [current, items.length]);

  const enabled = items.filter((i) => !i.disabled);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const idx = enabled.findIndex((i) => i.value === current);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? enabled.length - 1
          : (idx + (e.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length;
    const item = enabled[next];
    setCurrent(item.value);
    document.getElementById(`${id}-tab-${item.value}`)?.focus();
  };

  return (
    <div className={cx(styles.root, className)} data-variant={variant} data-size={size}>
      <div className={styles.listWrap}>
        <div
          ref={listRef}
          role="tablist"
          aria-label={ariaLabel}
          className={cx(styles.list, fullWidth && styles.fullWidth)}
          onKeyDown={onKeyDown}
        >
          <span
            className={styles.indicator}
            data-ready={indicator.ready}
            style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }}
            aria-hidden="true"
          />
          {items.map((item) => {
            const selected = item.value === current;
            return (
              <button
                key={item.value}
                id={`${id}-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${id}-panel-${item.value}`}
                tabIndex={selected ? 0 : -1}
                disabled={item.disabled}
                className={styles.tab}
                onClick={() => setCurrent(item.value)}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span>{item.label}</span>
                {item.badge !== undefined && <span className={styles.badge}>{item.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {items.some((i) => i.content !== undefined) &&
        items.map((item) => {
          const selected = item.value === current;
          if (!selected && !keepMounted) return null;
          return (
            <div
              key={item.value}
              id={`${id}-panel-${item.value}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${item.value}`}
              hidden={!selected}
              tabIndex={0}
              className={cx(styles.panel, panelClassName)}
              data-direction={direction}
            >
              {item.content}
            </div>
          );
        })}
    </div>
  );
}
