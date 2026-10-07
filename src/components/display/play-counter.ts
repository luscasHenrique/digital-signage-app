// src/components/display/play-counter.ts
// Contagem de exibições no player. Fica no localStorage até ser enviada,
// então sobrevive a recarregamentos e a períodos sem internet.
import { SCHEDULE_TIME_ZONE } from "@/lib/ad-weekly-schedule";

export type PlayCounts = Record<string, number>; // "YYYY-MM-DD|ad_id" -> exibições

/** Dia no horário de Brasília (o relatório agrupa por esse dia). */
export function playDay(now: Date): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHEDULE_TIME_ZONE }).format(now);
}

export function addPlay(counts: PlayCounts, adId: string, now: Date): PlayCounts {
  const key = `${playDay(now)}|${adId}`;
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

export function toPayload(counts: PlayCounts) {
  return Object.entries(counts).map(([key, plays]) => {
    const [day, ad_id] = key.split("|");
    return { day, ad_id, plays };
  });
}

/** Desconta o que foi enviado (novas exibições podem ter entrado no meio). */
export function subtractSent(current: PlayCounts, sent: PlayCounts): PlayCounts {
  const next: PlayCounts = {};
  for (const [key, value] of Object.entries(current)) {
    const left = value - (sent[key] ?? 0);
    if (left > 0) next[key] = left;
  }
  return next;
}

const storageKey = (slug: string) => `display-plays:${slug}`;

export function loadCounts(slug: string): PlayCounts {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCounts(slug: string, counts: PlayCounts) {
  try {
    if (Object.keys(counts).length === 0) localStorage.removeItem(storageKey(slug));
    else localStorage.setItem(storageKey(slug), JSON.stringify(counts));
  } catch {
    // Sem localStorage (modo privado/cheio): a contagem só se perde
  }
}
