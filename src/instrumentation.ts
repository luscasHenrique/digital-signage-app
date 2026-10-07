// src/instrumentation.ts
import type { Instrumentation } from "next";

export function register() {}

// Erros não tratados do servidor (páginas, Server Actions, rotas, middleware)
// vão para a página "Erros" do painel.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  // O registro usa a service role (Node); no Edge só fica no log da Vercel
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logError } = await import("@/lib/errors/log");
  const err = error as Error & { digest?: string };
  await logError({
    source: "server",
    message: err.message ?? String(error),
    stack: err.stack,
    digest: err.digest,
    url: `${request.method} ${request.path}`,
    userAgent: request.headers["user-agent"] as string | undefined,
    context: {
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
  });
};
