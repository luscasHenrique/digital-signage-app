"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { createPersistentRateLimiter } from "@/lib/persistent-rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { getSiteOrigin } from "@/lib/site-url";
import { createActionClient } from "@/lib/supabase/server";

type ActionResult = { success: boolean; message: string };

const resetAttempts = createPersistentRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000,
});

/**
 * Envia o e-mail de redefinição de senha. A resposta é sempre a mesma,
 * exista ou não a conta (não revela quais e-mails estão cadastrados).
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) {
    return { success: false, message: "Informe um e-mail válido." };
  }

  const attempt = await resetAttempts.consume(
    `password-reset:${await getClientIp()}`
  );
  if (!attempt.allowed) {
    const minutes = Math.ceil(attempt.retryAfterMs / 60000);
    return {
      success: false,
      message: `Muitas solicitações. Tente novamente em ${minutes} minuto(s).`,
    };
  }

  const supabase = createActionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.toLowerCase(),
    {
      // Depois do link, a pessoa cai em "Minha conta" para criar a senha
      redirectTo: `${await getSiteOrigin()}/auth/callback?next=${encodeURIComponent(
        "/dashboard/conta?nova-senha=1"
      )}`,
    }
  );
  if (error) console.error("Erro ao pedir redefinição de senha:", error.message);

  return {
    success: true,
    message:
      "Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha.",
  };
}

const passwordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não conferem.",
    path: ["confirm"],
  });

export async function updateOwnPassword(data: {
  password: string;
  confirm: string;
}): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Sessão expirada. Entre de novo." };

  const { error } = await ctx.supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    console.error("Erro ao trocar a senha:", error.message);
    return {
      success: false,
      message:
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível trocar a senha.",
    };
  }
  return { success: true, message: "Senha alterada." };
}

export async function updateOwnName(fullName: string): Promise<ActionResult> {
  const parsed = z
    .string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(120)
    .safeParse(fullName);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Sessão expirada. Entre de novo." };

  // O usuário só pode alterar full_name/avatar_url do próprio perfil (RLS + grant)
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name: parsed.data })
    .eq("id", ctx.user.id);
  if (error) {
    console.error("Erro ao atualizar nome:", error.message);
    return { success: false, message: "Não foi possível salvar o nome." };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true, message: "Nome atualizado." };
}
