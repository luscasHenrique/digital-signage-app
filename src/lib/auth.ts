// src/lib/auth.ts
import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { createActionClient, createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";

export interface AuthContext {
  user: User;
  role: UserRole;
  supabase: SupabaseClient;
}

/**
 * Retorna o usuário autenticado (validado no servidor do Supabase via getUser)
 * e o papel dele em `profiles`. Retorna null se não houver sessão válida.
 */
export async function getAuthContext(
  supabase: SupabaseClient = createActionClient()
): Promise<AuthContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role =
    profile?.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.STANDARD;

  return { user, role, supabase };
}

/** Para páginas administrativas: redireciona quem não está logado e esconde a página de quem não é ADMIN. */
export async function requireAdminPage(): Promise<AuthContext> {
  const ctx = await getAuthContext(createClient());
  if (!ctx) redirect("/login");
  if (ctx.role !== UserRole.ADMIN) notFound();
  return ctx;
}
