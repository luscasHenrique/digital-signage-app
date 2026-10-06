/* Validadores puros e reutilizáveis. Retornam a mensagem de erro ou null. */

export type Validator = (value: string) => string | null;

export const required =
  (message = "Campo obrigatório"): Validator =>
  (v) =>
    v.trim() ? null : message;

export const email =
  (message = "Digite um e-mail válido"): Validator =>
  (v) =>
    !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : message;

export const minLength =
  (n: number, message?: string): Validator =>
  (v) =>
    !v || v.length >= n ? null : (message ?? `Mínimo de ${n} caracteres`);

export const matches =
  (getOther: () => string, message = "Os valores não coincidem"): Validator =>
  (v) =>
    !v || v === getOther() ? null : message;

/** Aplica validadores em ordem e retorna o primeiro erro. */
export function validate(value: string, validators: Validator[]): string | null {
  for (const fn of validators) {
    const error = fn(value);
    if (error) return error;
  }
  return null;
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; checks: Record<string, boolean> };

export function passwordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const score = (password ? Math.max(1, passed) : 0) as PasswordStrength["score"];
  const labels = ["", "Fraca", "Razoável", "Boa", "Forte"];
  return { score, label: labels[score], checks };
}
