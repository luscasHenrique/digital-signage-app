// src/components/display/DisplayClock.tsx
"use client";

import { useEffect, useState } from "react";

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/**
 * Relógio isolado: só ele re-renderiza a cada atualização, não o slideshow.
 * Atualiza na virada de cada minuto (o relógio não mostra segundos).
 */
export function DisplayClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const date = new Date();
      setNow(date);
      timer = setTimeout(tick, 60_000 - (date.getTime() % 60_000) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  // Sem hora no HTML do servidor: evita divergência de fuso na hidratação
  if (!now) return null;

  return (
    <div className="lg-glass-strong rounded-[var(--lg-radius-xl)] px-5 py-3 text-center">
      <div className="text-4xl font-bold tabular-nums tracking-[var(--lg-tracking-tight)]">
        {timeFormat.format(now)}
      </div>
      <div className="text-sm text-[var(--lg-text-secondary)] first-letter:uppercase">
        {dateFormat.format(now)}
      </div>
    </div>
  );
}
