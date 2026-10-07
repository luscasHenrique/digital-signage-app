// src/lib/errors/format.ts
// Formatação da página "Erros" do painel.

export type ErrorLogRow = {
  id: number;
  created_at: string;
  source: "server" | "client" | "display";
  message: string;
  stack: string | null;
  url: string | null;
  digest: string | null;
  user_agent: string | null;
  context: unknown;
  user_id: string | null;
};

export const ERROR_SOURCE_LABEL: Record<ErrorLogRow["source"], string> = {
  server: "Servidor",
  client: "Painel",
  display: "TV",
};

/**
 * Agrupa por mensagem "parecida": números, ids e URLs viram curingas,
 * para "Mídia não carregou: Promo 1" e "...: Promo 2" contarem juntos só
 * quando a parte variável é técnica (ids, números).
 */
export function errorFingerprint(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\d+/g, "<n>")
    .slice(0, 200);
}

export function groupErrors(
  rows: { message: string; source: ErrorLogRow["source"]; created_at: string }[]
) {
  const groups = new Map<
    string,
    { message: string; source: ErrorLogRow["source"]; count: number; last: string }
  >();
  for (const row of rows) {
    const key = `${row.source}|${errorFingerprint(row.message)}`;
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      if (row.created_at > group.last) group.last = row.created_at;
    } else {
      groups.set(key, {
        message: row.message,
        source: row.source,
        count: 1,
        last: row.created_at,
      });
    }
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}
