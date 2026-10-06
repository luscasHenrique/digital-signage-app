import type { CSSProperties, ReactNode } from "react";
import { cx } from "../_internal/cx";
import styles from "./Loading.module.css";

export type LoadingVariant = "ring" | "spinner" | "dots" | "bars" | "pulse";
export type LoadingSize = "sm" | "md" | "lg";
export type LoadingTone = "accent" | "neutral" | "current";

const SIZES: Record<LoadingSize, number> = { sm: 16, md: 24, lg: 40 };

export type LoadingProps = {
  /** "ring" (padrão), "spinner" (iOS), "dots", "bars" ou "pulse" */
  variant?: LoadingVariant;
  /** sm 16px · md 24px · lg 40px, ou um número em px */
  size?: LoadingSize | number;
  /** "accent" (padrão), "neutral" ou "current" (herda a cor do texto) */
  tone?: LoadingTone;
  /** Texto visível ao lado/abaixo do indicador */
  label?: ReactNode;
  labelPlacement?: "end" | "bottom";
  /** 0–100: progresso determinado (somente variant="ring") */
  value?: number;
  /** Mostra a porcentagem no centro do ring determinado (a partir de 32px) */
  showValue?: boolean;
  /** Rótulo para leitores de tela quando não há `label` visível */
  srLabel?: string;
  className?: string;
  style?: CSSProperties;
};

/** Indicador de carregamento. Server-safe (sem "use client"). */
export function Loading({
  variant = "ring",
  size = "md",
  tone = "accent",
  label,
  labelPlacement = "end",
  value,
  showValue = false,
  srLabel = "Carregando",
  className,
  style,
}: LoadingProps) {
  const px = typeof size === "number" ? size : SIZES[size];
  const determinate = variant === "ring" && typeof value === "number";
  const clamped = determinate ? Math.min(100, Math.max(0, value)) : undefined;

  return (
    <span
      role={determinate ? "progressbar" : "status"}
      aria-label={typeof label === "string" ? label : srLabel}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={clamped !== undefined ? Math.round(clamped) : undefined}
      className={cx(styles.root, className)}
      data-tone={tone}
      data-placement={labelPlacement}
      style={{ "--loading-size": `${px}px`, ...style } as CSSProperties}
    >
      <span className={styles.indicator} data-variant={variant} aria-hidden="true">
        <Indicator variant={variant} value={clamped} showValue={showValue && px >= 32} />
      </span>
      {label != null && <span className={styles.label}>{label}</span>}
    </span>
  );
}

function Indicator({
  variant,
  value,
  showValue,
}: {
  variant: LoadingVariant;
  value?: number;
  showValue: boolean;
}) {
  switch (variant) {
    case "spinner":
      return Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${(i - 8) * 0.1}s` }} />
      ));
    case "dots":
      return (
        <>
          <i />
          <i />
          <i />
        </>
      );
    case "bars":
      return (
        <>
          <i />
          <i />
          <i />
          <i />
        </>
      );
    case "pulse":
      return (
        <>
          <i />
          <i />
          <b />
        </>
      );
    default: {
      // Circunferência de r=20 em viewBox 48 → 2πr ≈ 125.66
      const determinate = value !== undefined;
      return (
        <>
          <svg viewBox="0 0 48 48" className={styles.ring} data-determinate={determinate || undefined}>
            <circle className={styles.track} cx="24" cy="24" r="20" />
            <circle
              className={styles.arc}
              cx="24"
              cy="24"
              r="20"
              pathLength={100}
              style={determinate ? { strokeDashoffset: 100 - value } : undefined}
            />
          </svg>
          {determinate && showValue && <span className={styles.value}>{Math.round(value)}%</span>}
        </>
      );
    }
  }
}

export type LoadingBarProps = {
  /** 0–100. Sem valor = indeterminado (faixa que desliza) */
  value?: number;
  tone?: Exclude<LoadingTone, "current">;
  size?: LoadingSize;
  /** Texto acima da barra */
  label?: ReactNode;
  /** Mostra a porcentagem à direita do label */
  showValue?: boolean;
  srLabel?: string;
  className?: string;
  style?: CSSProperties;
};

/** Barra de progresso linear (determinada ou indeterminada). Server-safe. */
export function LoadingBar({
  value,
  tone = "accent",
  size = "md",
  label,
  showValue = false,
  srLabel = "Carregando",
  className,
  style,
}: LoadingBarProps) {
  const determinate = typeof value === "number";
  const clamped = determinate ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className={cx(styles.barRoot, className)} data-tone={tone} data-size={size} style={style}>
      {(label != null || (showValue && determinate)) && (
        <div className={styles.barHeader}>
          {label != null && <span className={styles.barLabel}>{label}</span>}
          {showValue && determinate && <span className={styles.barValue}>{Math.round(clamped)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={typeof label === "string" ? label : srLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? Math.round(clamped) : undefined}
        className={styles.barTrack}
        data-indeterminate={!determinate || undefined}
      >
        <span
          className={styles.barFill}
          style={determinate ? { transform: `scaleX(${clamped / 100})` } : undefined}
        />
      </div>
    </div>
  );
}
