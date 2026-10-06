// Query builder falso do Supabase: aceita qualquer cadeia de métodos,
// registra as chamadas e resolve com o resultado configurado.
export type Call = [method: string, args: unknown[]];

export function fakeQuery(result: { data?: unknown; error?: unknown } = {}) {
  const calls: Call[] = [];
  const resolved = { data: result.data ?? null, error: result.error ?? null };

  const query: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") {
          return (
            onFulfilled: (v: unknown) => unknown,
            onRejected: (e: unknown) => unknown
          ) => Promise.resolve(resolved).then(onFulfilled, onRejected);
        }
        return (...args: unknown[]) => {
          calls.push([prop, args]);
          if (prop === "single" || prop === "maybeSingle") {
            return Promise.resolve(resolved);
          }
          return query;
        };
      },
    }
  );

  return { query, calls };
}

/** Cliente falso: cada `from(tabela)` consome o próximo resultado da fila daquela tabela. */
export function fakeClient(results: Record<string, { data?: unknown; error?: unknown }[]> = {}) {
  const log: { table: string; calls: Call[] }[] = [];
  const queues = Object.fromEntries(
    Object.entries(results).map(([k, v]) => [k, [...v]])
  );

  const client = {
    from(table: string) {
      const next = queues[table]?.shift() ?? {};
      const { query, calls } = fakeQuery(next);
      log.push({ table, calls });
      return query;
    },
  };

  return { client, log };
}
