"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { cx } from "../_internal/cx";
import {
  useClickOutside,
  useControllableState,
  useFloatingPosition,
  usePresence,
  type Placement,
} from "../_internal/hooks";
import { CheckIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import styles from "./DropdownMenu.module.css";

export type MenuEntry =
  | {
      type?: "item";
      label: ReactNode;
      icon?: ReactNode;
      /** Atalho exibido à direita (ex.: "⌘C") */
      shortcut?: string;
      description?: ReactNode;
      onSelect?: () => void;
      disabled?: boolean;
      tone?: "default" | "danger";
      /** Mantém o menu aberto após selecionar */
      keepOpen?: boolean;
    }
  | {
      type: "checkbox";
      label: ReactNode;
      icon?: ReactNode;
      checked: boolean;
      onCheckedChange: (checked: boolean) => void;
      disabled?: boolean;
    }
  | { type: "separator" }
  | { type: "label"; label: ReactNode };

export type DropdownTriggerProps = {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  "aria-expanded": boolean;
  "aria-haspopup": "menu";
  "aria-controls": string;
};

export type DropdownMenuProps = {
  trigger: (props: DropdownTriggerProps) => ReactNode;
  items: MenuEntry[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  width?: number;
  className?: string;
};

export function DropdownMenu({
  trigger,
  items,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom-start",
  width = 240,
  className,
}: DropdownMenuProps) {
  const id = useId();
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusFirst = useRef<"first" | "last">("first");
  const { mounted, visible } = usePresence(open, 200);
  const pos = useFloatingPosition(anchorRef, menuRef, { open: mounted, placement, offset: 6 });

  useClickOutside([anchorRef, menuRef], () => setOpen(false), open);

  const getItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? []);

  // Foca o primeiro (ou último) item ao abrir
  useEffect(() => {
    if (!open || !mounted) return;
    const raf = requestAnimationFrame(() => {
      const list = getItems();
      (focusFirst.current === "last" ? list.at(-1) : list[0])?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) anchorRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = getItems();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list.at(-1)?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Typeahead: pula para o próximo item que começa com a letra
      const key = e.key.toLowerCase();
      const ordered = [...list.slice(index + 1), ...list.slice(0, index + 1)];
      ordered.find((el) => el.textContent?.trim().toLowerCase().startsWith(key))?.focus();
    }
  };

  const triggerKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusFirst.current = e.key === "ArrowDown" ? "first" : "last";
      setOpen(true);
    }
  };

  return (
    <>
      {trigger({
        ref: anchorRef,
        onClick: () => {
          focusFirst.current = "first";
          setOpen(!open);
        },
        onKeyDown: triggerKeyDown,
        "aria-expanded": open,
        "aria-haspopup": "menu",
        "aria-controls": id,
      })}
      {mounted && (
        <Portal>
          <div
            ref={menuRef}
            id={id}
            role="menu"
            className={cx(styles.menu, className)}
            data-visible={visible}
            data-side={pos.side}
            data-align={placement.split("-")[1] ?? "center"}
            style={{ top: pos.top, left: pos.left, width }}
            onKeyDown={onMenuKeyDown}
          >
            {items.map((entry, i) => {
              if (entry.type === "separator") return <div key={i} role="separator" className={styles.separator} />;
              if (entry.type === "label")
                return (
                  <div key={i} className={styles.label} role="presentation">
                    {entry.label}
                  </div>
                );
              if (entry.type === "checkbox")
                return (
                  <div
                    key={i}
                    role="menuitemcheckbox"
                    aria-checked={entry.checked}
                    aria-disabled={entry.disabled || undefined}
                    tabIndex={-1}
                    className={styles.item}
                    onClick={() => !entry.disabled && entry.onCheckedChange(!entry.checked)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !entry.disabled) {
                        e.preventDefault();
                        entry.onCheckedChange(!entry.checked);
                      }
                    }}
                  >
                    <span className={styles.check} data-checked={entry.checked}>
                      <CheckIcon size={14} />
                    </span>
                    {entry.icon && <span className={styles.icon}>{entry.icon}</span>}
                    <span className={styles.text}>{entry.label}</span>
                  </div>
                );
              const select = () => {
                if (entry.disabled) return;
                entry.onSelect?.();
                if (!entry.keepOpen) close();
              };
              return (
                <div
                  key={i}
                  role="menuitem"
                  aria-disabled={entry.disabled || undefined}
                  tabIndex={-1}
                  className={styles.item}
                  data-tone={entry.tone ?? "default"}
                  onClick={select}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select();
                    }
                  }}
                >
                  {entry.icon && <span className={styles.icon}>{entry.icon}</span>}
                  <span className={styles.text}>
                    <span>{entry.label}</span>
                    {entry.description && <span className={styles.description}>{entry.description}</span>}
                  </span>
                  {entry.shortcut && <kbd className={styles.shortcut}>{entry.shortcut}</kbd>}
                </div>
              );
            })}
          </div>
        </Portal>
      )}
    </>
  );
}
