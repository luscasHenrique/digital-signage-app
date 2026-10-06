import type { ReactNode } from "react";
import { cx } from "../_internal/cx";
import { AlertCircleIcon, CheckCircleIcon, CloseIcon, InfoIcon, WarningIcon } from "../_internal/icons";
import styles from "./Alert.module.css";

export type AlertProps = {
  tone?: "info" | "success" | "warning" | "danger";
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  className?: string;
};

const defaultIcons = {
  info: <InfoIcon size={18} />,
  success: <CheckCircleIcon size={18} />,
  warning: <WarningIcon size={18} />,
  danger: <AlertCircleIcon size={18} />,
};

export function Alert({ tone = "info", title, children, icon, onClose, className }: AlertProps) {
  return (
    <div
      className={cx(styles.alert, className)}
      data-tone={tone}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
    >
      <span className={styles.icon}>{icon ?? defaultIcons[tone]}</span>
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.body}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}
