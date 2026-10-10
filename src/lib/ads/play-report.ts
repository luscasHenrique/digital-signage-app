// src/lib/ads/play-report.ts
// Agrega as linhas de ad_play_stats para a página de relatório.

/** Linha devolvida por ad_play_report (já somada por anúncio + empresa). */
export type PlayReportRow = {
  advertisement_id: string;
  company_id: string;
  /** Título atual, ou o guardado na época se o anúncio foi excluído */
  ad_title: string | null;
  company_name: string | null;
  ad_deleted: boolean;
  plays: number;
  /** Segundos de tela (exibições x duração configurada) */
  seconds: number;
};

export type PlayReportLine = {
  key: string;
  adTitle: string;
  companyName: string;
  plays: number;
  /** Segundos de tela (exibições x duração configurada) */
  seconds: number;
};

export function buildPlayReport(rows: PlayReportRow[]) {
  const lines: PlayReportLine[] = rows
    .map((row) => {
      const title = row.ad_title ?? "Anúncio sem título";
      return {
        key: `${row.advertisement_id}|${row.company_id}`,
        adTitle: row.ad_deleted ? `${title} (excluído)` : title,
        companyName: row.company_name ?? "Empresa excluída",
        // bigint do Postgres pode chegar como string
        plays: Number(row.plays),
        seconds: Number(row.seconds),
      };
    })
    .sort((a, b) => b.plays - a.plays);
  return {
    lines,
    totalPlays: lines.reduce((sum, l) => sum + l.plays, 0),
    totalSeconds: lines.reduce((sum, l) => sum + l.seconds, 0),
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
