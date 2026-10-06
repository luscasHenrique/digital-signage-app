"use client";

import type { ReactNode } from "react";
import { cx } from "../_internal/cx";
import { CheckIcon } from "../_internal/icons";
import styles from "./Stepper.module.css";

export type StepItem = {
  title: ReactNode;
  description?: ReactNode;
  /** Ícone no lugar do número */
  icon?: ReactNode;
  /** Mostra "(opcional)" */
  optional?: boolean;
  /** Marca a etapa com erro */
  error?: boolean;
};

export type StepStatus = "complete" | "current" | "upcoming" | "error";

export type StepperProps = {
  steps: StepItem[];
  /** Índice da etapa atual (0 = primeira). Use steps.length para "tudo concluído". */
  current: number;
  /** Torna etapas concluídas clicáveis (voltar) */
  onStepClick?: (index: number) => void;
  /** Permite clicar também em etapas futuras */
  allowSkip?: boolean;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md";
  /** Conteúdo exibido sob a etapa atual (só na vertical) */
  children?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export function getStepStatus(index: number, current: number, step?: StepItem): StepStatus {
  if (step?.error) return "error";
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

/** Indicador de progresso em etapas (wizard, checkout, onboarding). */
export function Stepper({
  steps,
  current,
  onStepClick,
  allowSkip = false,
  orientation = "horizontal",
  size = "md",
  children,
  ariaLabel = "Progresso",
  className,
}: StepperProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className={cx(styles.list)} data-orientation={orientation} data-size={size}>
        {steps.map((step, i) => {
          const status = getStepStatus(i, current, step);
          const clickable = Boolean(onStepClick) && (status === "complete" || (allowSkip && i !== current));
          const isLast = i === steps.length - 1;
          const marker = (
            <span className={styles.marker} data-status={status}>
              {status === "complete" ? (
                <CheckIcon size={size === "sm" ? 13 : 15} className={styles.check} />
              ) : status === "error" ? (
                <span aria-hidden="true">!</span>
              ) : (
                (step.icon ?? <span>{i + 1}</span>)
              )}
            </span>
          );
          const text = (
            <span className={styles.text}>
              <span className={styles.title}>
                {step.title}
                {step.optional && <span className={styles.optional}> (opcional)</span>}
              </span>
              {step.description && <span className={styles.description}>{step.description}</span>}
            </span>
          );

          return (
            <li
              key={i}
              className={styles.step}
              data-status={status}
              aria-current={status === "current" ? "step" : undefined}
            >
              {clickable ? (
                <button type="button" className={styles.head} onClick={() => onStepClick?.(i)}>
                  {marker}
                  {text}
                </button>
              ) : (
                <div className={styles.head}>
                  {marker}
                  {text}
                </div>
              )}
              {!isLast && (
                <span className={styles.connector} aria-hidden="true">
                  <span className={styles.connectorFill} data-filled={i < current} />
                </span>
              )}
              {orientation === "vertical" && status === "current" && children && (
                <div className={styles.body}>{children}</div>
              )}
              <span className="lg-sr-only">
                {status === "complete" ? " — concluída" : status === "current" ? " — atual" : status === "error" ? " — com erro" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
