// src/lib/audit/format.ts
// Transforma registros de audit_logs em textos legíveis para a tela de Auditoria.
import type { AuditAction, JsonObject } from "@/types/audit";

export const AUDIT_TABLE_LABEL: Record<string, string> = {
  advertisements: "Anúncio",
  advertisements_companies: "Vínculo anúncio/empresa",
  companies: "Empresa",
  profiles: "Perfil",
};

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  INSERT: "Criou",
  UPDATE: "Atualizou",
  DELETE: "Excluiu",
};

const FIELD_LABEL: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  status: "Status",
  type: "Tipo",
  content_url: "Conteúdo",
  thumbnail_url: "Capa",
  start_date: "Início",
  end_date: "Fim",
  duration_seconds: "Duração (s)",
  overlay_text: "Texto do overlay",
  overlay_bg_color: "Cor do fundo",
  overlay_text_color: "Cor do texto",
  overlay_position: "Posição do overlay",
  name: "Nome",
  slug: "Slug",
  is_private: "Privada",
  password: "Senha",
  password_changed: "Senha alterada",
  email: "E-mail",
  full_name: "Nome completo",
  role: "Função",
};

/** Campos sensíveis: a tela mostra só que mudaram, nunca o valor. */
const SECRET_FIELDS = new Set(["password"]);

/** Campos técnicos que não interessam no resumo de alterações. */
const IGNORED_FIELDS = new Set([
  "created_at",
  "updated_at",
  "last_edited_by",
  "created_by",
]);

export function entityLabel(table: string): string {
  return AUDIT_TABLE_LABEL[table] ?? table;
}

export function fieldLabel(key: string): string {
  return FIELD_LABEL[key] ?? key;
}

export function formatAuditValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (SECRET_FIELDS.has(key)) return "••••••";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.includes("T") && !Number.isNaN(Date.parse(value))) {
      return new Date(value).toLocaleString("pt-BR");
    }
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Esconde os campos sensíveis antes de exibir o JSON bruto. */
export function redactSecrets(data: JsonObject | null): JsonObject | null {
  if (!data) return data;
  const copy: JsonObject = { ...data };
  for (const key of SECRET_FIELDS) {
    if (key in copy) copy[key] = "••••••";
  }
  return copy;
}

export function extractRecordTitle(
  before: JsonObject | null,
  after: JsonObject | null
): string | null {
  for (const obj of [after, before]) {
    const t = obj?.title ?? obj?.name ?? obj?.full_name;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  return null;
}

export type ChangeLine = {
  key: string;
  label: string;
  before: string;
  after: string;
};

export function computeChanges(
  before: JsonObject | null,
  after: JsonObject | null
): ChangeLine[] {
  const oldObj = before ?? {};
  const newObj = after ?? {};
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  const lines: ChangeLine[] = [];
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue;
    const a = oldObj[key];
    const b = newObj[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      lines.push({
        key,
        label: fieldLabel(key),
        before: formatAuditValue(key, a),
        after: formatAuditValue(key, b),
      });
    }
  }
  return lines;
}

/** "Atualizou Anúncio “Promoção de inverno”" */
export function summarizeAudit(
  action: AuditAction,
  table: string,
  before: JsonObject | null,
  after: JsonObject | null
): string {
  const title = extractRecordTitle(before, after);
  const base = `${AUDIT_ACTION_LABEL[action]} ${entityLabel(table).toLowerCase()}`;
  return title ? `${base} “${title}”` : base;
}
