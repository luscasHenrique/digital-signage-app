import type { CSSProperties, ReactNode } from "react";
import { cx } from "../_internal/cx";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  /** "rect" (padrão), "text" (linhas) ou "circle" */
  variant?: "rect" | "text" | "circle";
  width?: number | string;
  height?: number | string;
  /** Diâmetro para variant="circle" */
  size?: number;
  /** Quantidade de linhas para variant="text" (a última fica mais curta) */
  lines?: number;
  radius?: number | string;
  /** "shimmer" (brilho que passa) ou "pulse" */
  animation?: "shimmer" | "pulse" | "none";
  className?: string;
  style?: CSSProperties;
};

/** Placeholder de carregamento. Server-safe (sem "use client"). */
export function Skeleton({
  variant = "rect",
  width,
  height,
  size = 40,
  lines = 3,
  radius,
  animation = "shimmer",
  className,
  style,
}: SkeletonProps) {
  if (variant === "text") {
    return (
      <span className={cx(styles.lines, className)} style={{ width, ...style }} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={styles.skeleton}
            data-animation={animation}
            style={{
              height: height ?? "0.8em",
              width: lines > 1 && i === lines - 1 ? "62%" : "100%",
              borderRadius: radius ?? 6,
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </span>
    );
  }

  const isCircle = variant === "circle";
  return (
    <span
      aria-hidden="true"
      className={cx(styles.skeleton, styles.block, className)}
      data-animation={animation}
      style={{
        width: isCircle ? size : (width ?? "100%"),
        height: isCircle ? size : (height ?? 16),
        borderRadius: isCircle ? "50%" : (radius ?? "var(--lg-radius-sm)"),
        ...style,
      }}
    />
  );
}

/**
 * Envolve conteúdo que está carregando: anuncia "Carregando" para leitores de tela
 * e mostra o fallback (skeletons) até `loading` virar false.
 */
export function SkeletonGroup({
  loading,
  fallback,
  children,
  label = "Carregando",
  className,
}: {
  loading: boolean;
  fallback: ReactNode;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className} aria-busy={loading || undefined} aria-live="polite">
      {loading ? (
        <>
          <span className="lg-sr-only">{label}</span>
          {fallback}
        </>
      ) : (
        <div className={styles.reveal}>{children}</div>
      )}
    </div>
  );
}
