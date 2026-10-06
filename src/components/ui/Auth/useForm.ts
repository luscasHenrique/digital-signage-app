"use client";

import { useState, type FormEvent } from "react";
import { validate, type Validator } from "./validators";

type Rules<T> = { [K in keyof T]?: Validator[] | ((values: T) => Validator[]) };

/**
 * Mini gerenciador de formulário: valores, erros, "touched" e submit assíncrono.
 * Erros aparecem após o blur ou ao tentar enviar (padrão Apple: não acusar enquanto digita).
 */
export function useForm<T extends Record<string, string | boolean>>(initial: T, rules: Rules<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitCount, setSubmitCount] = useState(0);

  const errorOf = (key: keyof T, vals: T = values): string | null => {
    const rule = rules[key];
    if (!rule) return null;
    const list = Array.isArray(rule) ? rule : (rule as (values: T) => Validator[])(vals);
    const value = vals[key];
    return validate(typeof value === "boolean" ? (value ? "true" : "") : value, list);
  };

  const errors = Object.fromEntries(
    (Object.keys(initial) as Array<keyof T>).map((k) => [k, touched[k] ? errorOf(k) : null]),
  ) as Record<keyof T, string | null>;

  const setValue = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  };

  const field = <K extends keyof T>(key: K) => ({
    name: String(key),
    value: values[key] as string,
    error: errors[key] ?? undefined,
    onChange: (e: { target: { value: string } }) => setValue(key, e.target.value as T[K]),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  });

  const handleSubmit = (onValid: (values: T) => void | Promise<void>) => async (event: FormEvent) => {
    event.preventDefault();
    setSubmitCount((c) => c + 1);
    const allTouched = Object.fromEntries(Object.keys(initial).map((k) => [k, true])) as Record<keyof T, boolean>;
    setTouched(allTouched);
    const hasErrors = (Object.keys(initial) as Array<keyof T>).some((k) => errorOf(k));
    if (hasErrors) {
      // Foca o primeiro campo inválido
      const form = event.currentTarget as HTMLFormElement;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onValid(values);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return { values, errors, setValue, field, handleSubmit, submitting, formError, setFormError, submitCount };
}
