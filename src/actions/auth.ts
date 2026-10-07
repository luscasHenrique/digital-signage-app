"use server";

import { createActionClient } from "@/lib/supabase/server";
import { createPersistentRateLimiter } from "@/lib/security/persistent-rate-limit";
import { getClientIp } from "@/lib/security/request-ip";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; message: string };

// Além do limite do próprio Supabase Auth: trava força bruta por IP + e-mail.
const loginAttempts = createPersistentRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
});

export async function login(formData: FormData): Promise<ActionResult> {
  const supabase = createActionClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const rateKey = `login:${await getClientIp()}:${email.trim().toLowerCase()}`;
  const attempt = await loginAttempts.consume(rateKey);
  if (!attempt.allowed) {
    const minutes = Math.ceil(attempt.retryAfterMs / 60000);
    return {
      success: false,
      message: `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`,
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro no login:", error.message);
    return {
      success: false,
      message: "Credenciais inválidas. Tente novamente.",
    };
  }

  await loginAttempts.reset(rateKey);
  revalidatePath("/", "layout");
  return { success: true, message: "Login bem-sucedido!" };
}

export async function logout(): Promise<ActionResult> {
  const supabase = createActionClient();

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    revalidatePath("/");
    return { success: true, message: "Você saiu com sucesso." };
  } catch (error) {
    // O detalhe técnico fica só no log do servidor.
    console.error("ERRO NO LOGOUT:", error);
    return {
      success: false,
      message: "Não foi possível sair. Tente novamente.",
    };
  }
}
