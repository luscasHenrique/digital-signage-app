// src/lib/error-log.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type ErrorSource = "server" | "client" | "display";

export type ErrorReport = {
  source: ErrorSource;
  message: string;
  stack?: string | null;
  url?: string | null;
  digest?: string | null;
  userAgent?: string | null;
  context?: Record<string, unknown> | null;
  userId?: string | null;
};

const LIMITS = { message: 1000, stack: 8000, url: 1000, userAgent: 300 };

const cut = (value: string | null | undefined, max: number) =>
  value ? value.slice(0, max) : null;

/**
 * Grava um erro em error_logs (página "Erros" do painel).
 * Nunca lança: falhar ao registrar não pode derrubar quem chamou.
 */
export async function logError(report: ErrorReport): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("error_logs").insert({
      source: report.source,
      message: cut(report.message, LIMITS.message) || "Erro sem mensagem",
      stack: cut(report.stack, LIMITS.stack),
      url: cut(report.url, LIMITS.url),
      digest: cut(report.digest, 100),
      user_agent: cut(report.userAgent, LIMITS.userAgent),
      context: (report.context ?? null) as Json,
      user_id: report.userId ?? null,
    });
    if (error) console.warn("Falha ao registrar erro:", error.message);
  } catch (error) {
    console.warn("Falha ao registrar erro:", error);
  }
}

/** Apaga registros com mais de `days` dias (chamado pelo cron diário). */
export async function purgeOldErrorLogs(days = 30): Promise<number> {
  const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("error_logs")
    .delete({ count: "exact" })
    .lt("created_at", before);
  if (error) throw error;
  return count ?? 0;
}
