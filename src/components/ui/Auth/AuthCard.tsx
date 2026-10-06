import type { ReactNode } from "react";
import { cx } from "../_internal/cx";
import styles from "./Auth.module.css";

export type AuthCardProps = {
  logo?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Sem a superfície de vidro (para usar dentro de outro container) */
  bare?: boolean;
  className?: string;
};

export function AuthCard({ logo, title, subtitle, children, footer, bare, className }: AuthCardProps) {
  return (
    <section className={cx(styles.card, bare && styles.bare, className)}>
      <header className={styles.cardHeader}>
        {logo && <div className={styles.logo}>{logo}</div>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      {children}
      {footer && <footer className={styles.cardFooter}>{footer}</footer>}
    </section>
  );
}

export type SocialProvider = { id: string; label: string; icon?: ReactNode; onClick?: () => void };

export function SocialButtons({ providers, disabled }: { providers: SocialProvider[]; disabled?: boolean }) {
  return (
    <>
      <div className={styles.social}>
        {providers.map((p) => (
          <button key={p.id} type="button" className={styles.socialButton} onClick={p.onClick} disabled={disabled}>
            {p.icon}
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.divider}>
        <span>ou continue com e-mail</span>
      </div>
    </>
  );
}
