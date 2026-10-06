import { CheckIcon } from "../_internal/icons";
import { passwordStrength } from "./validators";
import styles from "./Auth.module.css";

const checkLabels: Record<string, string> = {
  length: "8+ caracteres",
  upper: "Letra maiúscula",
  number: "Número",
  symbol: "Símbolo",
};

export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label, checks } = passwordStrength(password);

  return (
    <div className={styles.strength} data-score={score} aria-live="polite">
      <div className={styles.strengthBars} aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} data-on={score >= i} />
        ))}
      </div>
      <div className={styles.strengthRow}>
        <ul role="list" className={styles.checks}>
          {Object.entries(checks).map(([key, ok]) => (
            <li key={key} data-ok={ok}>
              <CheckIcon size={11} />
              {checkLabels[key]}
            </li>
          ))}
        </ul>
        {label && <span className={styles.strengthLabel}>{label}</span>}
      </div>
    </div>
  );
}
