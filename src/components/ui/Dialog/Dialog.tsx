"use client";

import { useId, useRef, type ReactNode, type RefObject } from "react";
import { cx } from "../_internal/cx";
import { useFocusTrap, useScrollLock } from "../_internal/focus";
import { useEscapeKey, usePresence } from "../_internal/hooks";
import { CloseIcon } from "../_internal/icons";
import { Portal } from "../_internal/Portal";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Ícone/ilustração acima do título (estilo alerta do iOS) */
  icon?: ReactNode;
  children?: ReactNode;
  /** Botões de ação no rodapé */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  /** "center" (padrão) ou "sheet" (sobe de baixo, como no iOS). No mobile, center vira sheet. */
  placement?: "center" | "sheet";
  /** Fechar ao clicar fora. Padrão: true */
  closeOnOverlay?: boolean;
  /** Fechar com Esc. Padrão: true */
  closeOnEsc?: boolean;
  /** Mostra o botão X. Padrão: true */
  showClose?: boolean;
  /** Elemento que recebe o foco ao abrir */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Papel ARIA. Use "alertdialog" para confirmações destrutivas. */
  role?: "dialog" | "alertdialog";
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  placement = "center",
  closeOnOverlay = true,
  closeOnEsc = true,
  showClose = true,
  initialFocus,
  role = "dialog",
  className,
}: DialogProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { mounted, visible } = usePresence(open, 280);

  useScrollLock(mounted);
  useFocusTrap(panelRef, open, initialFocus);
  useEscapeKey(() => onOpenChange(false), open && closeOnEsc);

  if (!mounted) return null;

  return (
    <Portal>
      <div className={styles.root} data-visible={visible} data-placement={placement}>
        <div
          className={styles.overlay}
          aria-hidden="true"
          onClick={() => closeOnOverlay && onOpenChange(false)}
        />
        <div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={title ? `${id}-title` : undefined}
          aria-describedby={description ? `${id}-desc` : undefined}
          tabIndex={-1}
          className={cx(styles.panel, className)}
          data-size={size}
        >
          {placement === "sheet" && <span className={styles.grabber} aria-hidden="true" />}
          {showClose && (
            <button
              type="button"
              className={styles.close}
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              data-skip-autofocus
            >
              <CloseIcon size={15} />
            </button>
          )}
          {(icon || title || description) && (
            <header className={cx(styles.header, Boolean(icon) && styles.headerCentered)}>
              {icon && <div className={styles.icon}>{icon}</div>}
              {title && (
                <h2 id={`${id}-title`} className={styles.title}>
                  {title}
                </h2>
              )}
              {description && (
                <p id={`${id}-desc`} className={styles.description}>
                  {description}
                </p>
              )}
            </header>
          )}
          {children && <div className={styles.body}>{children}</div>}
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      </div>
    </Portal>
  );
}
