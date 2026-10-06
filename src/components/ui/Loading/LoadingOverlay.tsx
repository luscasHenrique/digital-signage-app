"use client";

import type { CSSProperties, ReactNode } from "react";
import { cx } from "../_internal/cx";
import { useScrollLock } from "../_internal/focus";
import { usePresence } from "../_internal/hooks";
import { Portal } from "../_internal/Portal";
import { Loading, type LoadingVariant } from "./Loading";
import styles from "./LoadingOverlay.module.css";

export type LoadingOverlayProps = {
  /** Mostra/esconde o overlay (com animação de entrada/saída) */
  visible: boolean;
  /** Cobre a tela inteira (Portal + trava o scroll). Padrão: cobre o pai mais próximo com position: relative */
  fullscreen?: boolean;
  variant?: LoadingVariant;
  label?: ReactNode;
  description?: ReactNode;
  /** Ação opcional abaixo do texto (ex.: botão Cancelar) */
  action?: ReactNode;
  /** Mostra o cartão de vidro em volta do indicador. Padrão: true */
  card?: boolean;
  /** Desfoque do conteúdo por trás. Padrão: true */
  blur?: boolean;
  /** 0–100 para progresso determinado */
  value?: number;
  className?: string;
  style?: CSSProperties;
};

/** Camada de carregamento sobre uma área ou sobre a tela toda. */
export function LoadingOverlay({
  visible,
  fullscreen = false,
  variant = "ring",
  label = "Carregando…",
  description,
  action,
  card = true,
  blur = true,
  value,
  className,
  style,
}: LoadingOverlayProps) {
  const { mounted, visible: shown } = usePresence(visible, 250);
  useScrollLock(fullscreen && visible);

  if (!mounted) return null;

  const overlay = (
    <div
      className={cx(styles.overlay, className)}
      data-fullscreen={fullscreen || undefined}
      data-blur={blur || undefined}
      data-state={shown ? "open" : "closed"}
      aria-busy="true"
      style={style}
    >
      <div className={styles.content} data-card={card || undefined}>
        <Loading
          variant={variant}
          size={value !== undefined ? 52 : "lg"}
          value={value}
          showValue={value !== undefined}
          srLabel={typeof label === "string" ? label : "Carregando"}
        />
        {(label || description) && (
          <div className={styles.text}>
            {label && <p className={styles.label}>{label}</p>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
        )}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );

  return fullscreen ? <Portal>{overlay}</Portal> : overlay;
}
