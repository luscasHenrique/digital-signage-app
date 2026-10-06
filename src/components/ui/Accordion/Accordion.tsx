"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useControllableState } from "../_internal/hooks";
import { ChevronDownIcon } from "../_internal/icons";
import styles from "./Accordion.module.css";

export type AccordionItem = {
  value: string;
  title: ReactNode;
  /** Texto secundário abaixo do título */
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Conteúdo à direita do título (badge, status...) */
  meta?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type AccordionProps = {
  items: AccordionItem[];
  /** "single": um aberto por vez · "multiple": vários */
  type?: "single" | "multiple";
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Em type="single", permite fechar o item aberto. Padrão: true */
  collapsible?: boolean;
  /** "inset": um card com divisórias · "separated": um card por item · "plain": sem fundo */
  variant?: "inset" | "separated" | "plain";
  /** Posição do chevron */
  chevron?: "end" | "start";
  /** Nível do heading de cada item (acessibilidade) */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
};

export function Accordion({
  items,
  type = "single",
  value,
  defaultValue = [],
  onValueChange,
  collapsible = true,
  variant = "inset",
  chevron = "end",
  headingLevel = 3,
  className,
}: AccordionProps) {
  const id = useId();
  const [open, setOpen] = useControllableState(value, defaultValue, onValueChange);
  const Heading = `h${headingLevel}` as const;

  const toggle = (itemValue: string) => {
    const isOpen = open.includes(itemValue);
    if (type === "multiple") {
      setOpen(isOpen ? open.filter((v) => v !== itemValue) : [...open, itemValue]);
    } else if (isOpen) {
      if (collapsible) setOpen([]);
    } else {
      setOpen([itemValue]);
    }
  };

  // Setas ↑ ↓ / Home / End navegam entre os cabeçalhos
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const root = e.currentTarget.closest(`.${styles.root}`);
    const triggers = Array.from(root?.querySelectorAll<HTMLButtonElement>(`.${styles.trigger}:not(:disabled)`) ?? []);
    const i = triggers.indexOf(e.currentTarget);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? triggers.length - 1
          : (i + (e.key === "ArrowDown" ? 1 : -1) + triggers.length) % triggers.length;
    triggers[next]?.focus();
  };

  return (
    <div className={cx(styles.root, className)} data-variant={variant}>
      {items.map((item) => {
        const isOpen = open.includes(item.value);
        const triggerId = `${id}-trigger-${item.value}`;
        const panelId = `${id}-panel-${item.value}`;
        return (
          <div key={item.value} className={styles.item} data-open={isOpen} data-disabled={item.disabled}>
            <Heading className={styles.heading}>
              <button
                type="button"
                id={triggerId}
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                data-chevron={chevron}
                onClick={() => toggle(item.value)}
                onKeyDown={onKeyDown}
              >
                <span className={styles.chevron} aria-hidden="true">
                  <ChevronDownIcon size={16} />
                </span>
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.titles}>
                  <span className={styles.title}>{item.title}</span>
                  {item.subtitle && <span className={styles.subtitle}>{item.subtitle}</span>}
                </span>
                {item.meta && <span className={styles.meta}>{item.meta}</span>}
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className={styles.panel}
              data-open={isOpen}
              inert={!isOpen}
            >
              <div className={styles.panelInner}>
                <div className={styles.content}>{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
