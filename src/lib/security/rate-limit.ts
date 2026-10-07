// src/lib/security/rate-limit.ts

/**
 * Limitador de tentativas em memória (janela fixa).
 * Vale por instância do servidor: em deploy com várias instâncias/serverless,
 * troque por um armazenamento compartilhado (ex.: Redis/Upstash ou tabela no Postgres).
 */
export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    /** Registra uma tentativa e informa se ela ainda está dentro do limite. */
    consume(key: string, now = Date.now()) {
      for (const [k, entry] of hits) {
        if (entry.resetAt <= now) hits.delete(k);
      }

      const entry = hits.get(key) ?? { count: 0, resetAt: now + windowMs };
      entry.count += 1;
      hits.set(key, entry);

      return {
        allowed: entry.count <= limit,
        retryAfterMs: Math.max(0, entry.resetAt - now),
      };
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}
