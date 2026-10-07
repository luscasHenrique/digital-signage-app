// src/lib/errors/reporter.ts
// Envio de erros do navegador para /api/errors (página "Erros" do painel).

type ClientErrorSource = "client" | "display";

/** Mesmo erro repetido dentro deste intervalo é enviado uma vez só. */
const DEDUPE_MS = 60_000;
const recent = new Map<string, number>();

export function reportClientError(
  error: unknown,
  options: { source?: ClientErrorSource; context?: Record<string, unknown> } = {}
): void {
  if (typeof window === "undefined") return;

  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : JSON.stringify(error));
  const digest = (err as Error & { digest?: string }).digest;
  const key = `${options.source}|${err.message}`;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < DEDUPE_MS) return;
  recent.set(key, now);

  const source =
    options.source ??
    (window.location.pathname.startsWith("/display/") ? "display" : "client");

  void fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source,
      message: err.message || "Erro sem mensagem",
      stack: err.stack,
      url: window.location.href,
      digest,
      context: options.context,
    }),
    keepalive: true,
  }).catch(() => {
    // Sem rede: o erro se perde (o display offline continua funcionando)
  });
}

/** Só para testes. */
export function resetErrorReporter() {
  recent.clear();
}
