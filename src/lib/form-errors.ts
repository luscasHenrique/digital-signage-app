// src/lib/form-errors.ts
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

type FieldErrors = Record<string, string[] | undefined>;

/**
 * Distribui os erros retornados por uma Server Action:
 * `_server` vira toast, os demais vão para o campo correspondente do formulário.
 */
export function applyActionErrors<T extends FieldValues>(
  errors: FieldErrors | string | undefined,
  setError: UseFormSetError<T>,
  showError: (message: string) => void
) {
  if (!errors) return;
  if (typeof errors === "string") {
    showError(errors);
    return;
  }

  for (const [key, messages] of Object.entries(errors)) {
    if (!messages?.length) continue;
    if (key === "_server") showError(messages.join(", "));
    else setError(key as Path<T>, { message: messages.join(", ") });
  }
}
