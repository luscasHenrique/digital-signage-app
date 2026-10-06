import styles from "./Spinner.module.css";

export type SpinnerProps = { size?: number; label?: string; className?: string };

/** Spinner no estilo "activity indicator" do iOS (12 hastes). */
export function Spinner({ size = 16, label = "Carregando", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={[styles.spinner, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    >
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${(i - 8) * 0.1}s` }} />
      ))}
    </span>
  );
}
