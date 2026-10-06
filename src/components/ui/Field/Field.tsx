"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../_internal/cx";
import { AlertCircleIcon, CheckCircleIcon } from "../_internal/icons";
import styles from "./Field.module.css";

export type FieldStatusProps = {
  /** Texto de ajuda exibido abaixo do controle */
  hint?: ReactNode;
  /** Mensagem de erro. `true` aplica o estado de erro sem mensagem. */
  error?: ReactNode | boolean;
  /** Mensagem de sucesso. `true` aplica o estado sem mensagem. */
  success?: ReactNode | boolean;
};

export type FieldProps = FieldStatusProps & {
  id: string;
  label?: ReactNode;
  required?: boolean;
  /** Mostra "(opcional)" ao lado do label */
  optional?: boolean;
  /** Conteúdo à direita do label (ex.: link "Esqueceu a senha?") */
  labelAction?: ReactNode;
  /** Conteúdo à direita da linha de mensagens (ex.: contador 12/200) */
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
};

export const fieldMessageId = (id: string) => `${id}-message`;

type Tone = "error" | "success" | "hint";

/** Lembra a última mensagem para animar a saída sem o texto sumir antes. */
function useLastMessage(message: ReactNode, tone: Tone | null) {
  const [last, setLast] = useState<{ message: ReactNode; tone: Tone | null }>({ message, tone });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (message) setLast({ message, tone });
  }, [message, tone]);
  return message ? { message, tone } : last;
}

/** Normaliza error/success/hint num único status. Usado por todos os inputs. */
export function resolveStatus({ error, success, hint }: FieldStatusProps) {
  const invalid = Boolean(error);
  const valid = !invalid && Boolean(success);
  const hasMessage =
    (invalid && typeof error !== "boolean") || (valid && typeof success !== "boolean") || Boolean(hint);
  return { invalid, valid, hasMessage };
}

export function Field({
  id,
  label,
  required,
  optional,
  labelAction,
  hint,
  error,
  success,
  meta,
  className,
  children,
}: FieldProps) {
  const errorText = typeof error === "boolean" ? null : error;
  const successText = typeof success === "boolean" ? null : success;

  const tone: Tone | null = errorText ? "error" : successText ? "success" : hint ? "hint" : null;
  const current = errorText || successText || hint;
  const { message: shown, tone: shownTone } = useLastMessage(current, tone);

  return (
    <div className={cx(styles.field, className)}>
      {(label || labelAction) && (
        <div className={styles.labelRow}>
          {label && (
            <label htmlFor={id} className={styles.label}>
              {label}
              {required && (
                <span className={styles.required} aria-hidden="true">
                  *
                </span>
              )}
              {optional && <span className={styles.optional}>(opcional)</span>}
            </label>
          )}
          {labelAction}
        </div>
      )}

      {children}

      <div className={styles.messageRow}>
        <div className={styles.messageCollapse} data-open={Boolean(current)}>
          <div
            id={fieldMessageId(id)}
            className={cx(styles.messageInner, shownTone && styles[shownTone])}
            role={tone === "error" ? "alert" : undefined}
          >
            {shownTone === "error" && <AlertCircleIcon size={13} />}
            {shownTone === "success" && <CheckCircleIcon size={13} />}
            <span>{shown}</span>
          </div>
        </div>
        {meta && <span className={styles.meta}>{meta}</span>}
      </div>
    </div>
  );
}

export { styles as fieldStyles };
