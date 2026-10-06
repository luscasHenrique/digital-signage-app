/* Utilitários de data sem dependências. Todas as datas são tratadas no fuso local, à meia-noite. */

export type DateRange = { from: Date | null; to: Date | null };

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
};
export const isSameDay = (a?: Date | null, b?: Date | null) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
export const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const compareDay = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();
export const isBetween = (d: Date, from: Date, to: Date) => compareDay(d, from) >= 0 && compareDay(d, to) <= 0;

/** Matriz de 6 semanas (42 dias) para o mês, começando em weekStartsOn (0 = domingo). */
export function monthMatrix(month: Date, weekStartsOn = 0): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekdayNames(locale: string, weekStartsOn = 0) {
  // 2023-01-01 foi um domingo
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2023, 0, 1 + ((i + weekStartsOn) % 7))),
  );
}

export const formatDate = (d: Date | null | undefined, locale = "pt-BR", options?: Intl.DateTimeFormatOptions) =>
  d ? new Intl.DateTimeFormat(locale, options ?? { day: "2-digit", month: "short", year: "numeric" }).format(d) : "";

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
