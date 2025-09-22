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
