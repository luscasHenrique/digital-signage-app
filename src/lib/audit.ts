// src/lib/audit.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEvent = {
  action: string; // ex.: "SIGNED_UPLOAD_URL", "STORAGE_REMOVE", "LOGIN"
  entity: string; // ex.: "storage", "auth", "system"
  entity_id?: string | null; // ex.: path do arquivo ou id relacionado
  details?: Record<string, unknown> | null; // extras livres
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
};

/**
 * Loga evento manualmente em public.audit_logs.
 * Use para tudo que NÃO tem trigger (storage, auth, integrações externas, etc.)
 */
export async function logAudit(
  supabase: SupabaseClient,
  evt: AuditEvent
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_logs").insert({
    user_id: user?.id ?? null,
    action: evt.action,
    entity: evt.entity,
    entity_id: evt.entity_id ?? null,
    before_data: evt.before_data ?? null,
    after_data: evt.after_data ?? null,
    metadata: evt.details ?? {},
  });
}
