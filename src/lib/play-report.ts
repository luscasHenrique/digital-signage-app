// src/lib/play-report.ts
// Agrega as linhas de ad_play_stats para a página de relatório.

export type PlayStatRow = {
  day: string;
  plays: number;
  advertisement_id: string;
  company_id: string;
  advertisement: { title: string; duration_seconds: number } | null;
  company: { name: string } | null;
};

export type PlayReportLine = {
  key: string;
  adTitle: string;
  companyName: string;
  plays: number;
  /** Segundos de tela (exibições x duração configurada) */
  seconds: number;
};

export function aggregatePlays(rows: PlayStatRow[]) {
  const lines = new Map<string, PlayReportLine>();
  for (const row of rows) {
    const key = `${row.advertisement_id}|${row.company_id}`;
    const line = lines.get(key) ?? {
      key,
      adTitle: row.advertisement?.title ?? "Anúncio excluído",
      companyName: row.company?.name ?? "Empresa excluída",
      plays: 0,
      seconds: 0,
    };
    line.plays += row.plays;
    line.seconds += row.plays * (row.advertisement?.duration_seconds ?? 0);
    lines.set(key, line);
  }
  const sorted = [...lines.values()].sort((a, b) => b.plays - a.plays);
  return {
    lines: sorted,
    totalPlays: sorted.reduce((sum, l) => sum + l.plays, 0),
    totalSeconds: sorted.reduce((sum, l) => sum + l.seconds, 0),
    ads: new Set(rows.map((r) => r.advertisement_id)).size,
  };
}

/** 5400 → "1 h 30 min"; 90 → "2 min"; 20 → "20 s". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Valida "YYYY-MM-DD" vindo da URL. */
export function parseDayParam(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}
