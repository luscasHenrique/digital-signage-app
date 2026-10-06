"use client";

import { useId, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { cx } from "../_internal/cx";
import {
  useClickOutside,
  useControllableState,
  useEscapeKey,
  useFloatingPosition,
  usePresence,
  type Placement,
} from "../_internal/hooks";
import { Portal } from "../_internal/Portal";
import styles from "./Popover.module.css";

export type PopoverTriggerProps = {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "aria-controls": string;
};

export type PopoverProps = {
  /** Renderiza o gatilho recebendo as props de acessibilidade/ref. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  offset?: number;
  /** Largura do painel (px ou CSS) */
  width?: number | string;
  /** Rótulo acessível do painel */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export function Popover({
  trigger,
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom-start",
  offset = 8,
  width,
  label,
  className,
  style,
}: PopoverProps) {
  const id = useId();
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, 220);
  const pos = useFloatingPosition(anchorRef, panelRef, { open: mounted, placement, offset });

  const close = () => setOpen(false);
  useClickOutside([anchorRef, panelRef], close, open);
  useEscapeKey(() => {
    close();
    anchorRef.current?.focus();
  }, open);

  const align = placement.split("-")[1] ?? "center";

  return (
    <>
      {trigger({
        ref: anchorRef,
        onClick: () => setOpen(!open),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": id,
      })}
      {mounted && (
        <Portal>
          <div
            ref={panelRef}
            id={id}
            role="dialog"
            aria-label={label}
            className={cx(styles.panel, className)}
            data-side={pos.side}
            data-align={align}
            data-visible={visible}
            style={{ top: pos.top, left: pos.left, width, ...style }}
          >
            {typeof children === "function" ? children({ close }) : children}
          </div>
        </Portal>
      )}
    </>
  );
}
