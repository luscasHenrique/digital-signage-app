"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useEscapeKey, useFloatingPosition, usePresence, type Placement } from "../_internal/hooks";
import { Portal } from "../_internal/Portal";
import styles from "./Tooltip.module.css";

export type TooltipProps = {
  content: ReactNode;
  placement?: Placement;
  /** Atraso para abrir (ms) */
  delay?: number;
  offset?: number;
  /** Desativa sem remover o wrapper (ex.: sidebar expandida) */
  disabled?: boolean;
  /** Atalho exibido ao lado do texto (ex.: "⌘K") */
  shortcut?: string;
  /** Classe do wrapper que envolve o gatilho */
  className?: string;
  children: ReactNode;
};

export function Tooltip({
  content,
  placement = "top",
  delay = 350,
  offset = 8,
  disabled = false,
  shortcut,
  className,
  children,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [open, setOpen] = useState(false);
  const isOpen = open && !disabled;
  const { mounted, visible } = usePresence(isOpen, 150);
  const pos = useFloatingPosition(anchorRef, floatingRef, { open: mounted, placement, offset });

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  useEscapeKey(hide, isOpen);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <span
        ref={anchorRef}
        className={cx(styles.anchor, className)}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={hide}
        aria-describedby={isOpen ? id : undefined}
      >
        {children}
      </span>
      {mounted && (
        <Portal>
          <div
            ref={floatingRef}
            id={id}
            role="tooltip"
            className={styles.tooltip}
            data-side={pos.side}
            data-visible={visible}
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
            {shortcut && <kbd className={styles.kbd}>{shortcut}</kbd>}
          </div>
        </Portal>
      )}
    </>
  );
}
