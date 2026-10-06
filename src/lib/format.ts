// src/lib/format.ts

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** "01/10/2026 – 31/10/2026" (ou só uma data, se for o mesmo dia). */
export function formatPeriod(start: string | Date, end: string | Date): string {
  const from = dateFormat.format(new Date(start));
  const to = dateFormat.format(new Date(end));
  return from === to ? from : `${from} – ${to}`;
}
