// src/app/auth/callback/route.ts
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Retorno dos links enviados por e-mail (redefinição de senha).
 * Aceita os dois formatos do Supabase: `?code=` (PKCE, template padrão) e
 * `?token_hash=&type=` (template personalizado).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("Falha ao validar link (code):", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    ok = !error;
    if (error) console.error("Falha ao validar link (token):", error.message);
  }

  if (ok) return NextResponse.redirect(new URL(next, origin));

  const login = new URL("/login", origin);
  login.searchParams.set(
    "message",
    "Link inválido ou expirado. Peça um novo em “Esqueci minha senha”."
  );
  return NextResponse.redirect(login);
}
