// src/lib/security/persistent-rate-limit.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRateLimiter } from "@/lib/security/rate-limit";

type Options = { limit: number; windowMs: number };

/**
 * Limite de tentativas guardado no banco (função consume_rate_limit), válido
 * entre todas as instâncias do servidor. Se o banco falhar, usa a memória
 * da instância como reserva, para nunca liberar tentativas sem limite.
 */
export function createPersistentRateLimiter({ limit, windowMs }: Options) {
  const fallback = createRateLimiter({ limit, windowMs });

  return {
    async consume(
      key: string
    ): Promise<{ allowed: boolean; retryAfterMs: number }> {
      try {
        const { data, error } = await supabaseAdmin
          .rpc("consume_rate_limit", {
            p_key: key,
            p_limit: limit,
            p_window_seconds: Math.ceil(windowMs / 1000),
          })
          .single<{ allowed: boolean; retry_after_seconds: number }>();
        if (error || !data) throw error ?? new Error("Resposta vazia");
        return {
          allowed: data.allowed,
          retryAfterMs: data.retry_after_seconds * 1000,
        };
      } catch (error) {
        console.warn(
          "Limite de tentativas em memória (banco indisponível):",
          error
        );
        return fallback.consume(key);
      }
    },

    async reset(key: string): Promise<void> {
      fallback.reset(key);
      try {
        await supabaseAdmin.rpc("reset_rate_limit", { p_key: key });
      } catch {
        // Sem problema: a janela expira sozinha
      }
    },
  };
}
