// src/types/audit.ts

/** Ações possíveis capturadas pelos triggers */
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

/** JSON genérico (nível 1) usado na auditoria */
export type JsonObject = Record<string, unknown>;

/** Linha bruta vinda do banco (shape da tabela public.audit_logs) */
export interface AuditLogDB {
  id: number;
  created_at: string;
  action: unknown; // pode vir como string
  table_name: string;
  record_pk: string;
  user_id: string | null;
  user_email: string | null;
  before_data: unknown | null;
  after_data: unknown | null;
}

/** Linha preparada para o cliente (UI) */
export interface AuditRow {
  id: number;
  created_at: string;
  action: AuditAction;
  table_name: string;
  record_pk: string;
  user_id: string | null;
  user_email: string | null;
  before_data: JsonObject | null;
  after_data: JsonObject | null;
  actor?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

/** Search params aceitos pela página */
export type SearchParamsAudit = {
  q?: string;
  table?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string;
  perPage?: string;
};

/* ---------------- Helpers tipados (reutilizáveis) ---------------- */

export function toAuditAction(a: unknown): AuditAction {
  if (a === "INSERT" || a === "UPDATE" || a === "DELETE") return a;
  if (typeof a === "string") {
    const up = a.toUpperCase();
    if (up === "INSERT" || up === "UPDATE" || up === "DELETE") {
      return up as AuditAction;
    }
  }
  return "UPDATE";
}

export function normalizeDetails(
  v: unknown | null | undefined
): JsonObject | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as JsonObject;
  }
  return null;
}

/** Converte parâmetro de paginação da URL em inteiro dentro do intervalo. */
export function parsePageParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const n = parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Remove caracteres com significado na sintaxe de filtros do PostgREST
 * (vírgula, parênteses, aspas, barra invertida) e curingas do LIKE.
 */
export function sanitizeAuditSearchTerm(value: string | undefined): string {
  return (value ?? "")
    .replace(/[,()"'\\%*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Campos do JSON (antes/depois) em que a busca da auditoria procura. */
const AUDIT_SEARCH_JSON_KEYS = ["title", "name", "full_name", "slug", "email"];

/**
 * Monta o filtro `.or()` da busca. O PostgREST não aceita `coluna::text` em
 * filtros, então o JSON é pesquisado campo a campo com `->>`.
 * `term` precisa vir de `sanitizeAuditSearchTerm`.
 */
export function buildAuditSearchFilter(term: string): string {
  const like = `ilike.%${term}%`;
  return [
    `table_name.${like}`,
    `user_email.${like}`,
    `record_pk.${like}`,
    ...AUDIT_SEARCH_JSON_KEYS.flatMap((key) => [
      `after_data->>${key}.${like}`,
      `before_data->>${key}.${like}`,
    ]),
  ].join(",");
}
