// src/lib/auth/site-url.ts
import "server-only";

import { headers } from "next/headers";

/**
 * Origem pública do site (para links enviados por e-mail).
 * NEXT_PUBLIC_SITE_URL tem prioridade; senão, usa o host da requisição.
 */
export async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Só caminhos internos ("/dashboard"), nunca "//outro-site" ou URLs absolutas.
 * O navegador trata "\" como "/", então "/\evil.com" também é recusado.
 */
export function safeRedirectPath(value: string | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || /[\\\s]/.test(value)) return fallback;
  const base = "http://interno.invalid";
  const url = new URL(value, base);
  if (url.origin !== base) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
