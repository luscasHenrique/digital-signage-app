// src/actions/auth.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// A função agora retorna uma Promise com um objeto de status e mensagem
export async function login(
  formData: FormData
): Promise<{ status: "error" | "success"; message: string }> {
  const supabase = createServerClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro no login:", error.message);
    // Retorna um objeto de erro para o cliente lidar
    return {
      status: "error",
      message: "Credenciais inválidas. Tente novamente.",
    };
  }

  // Em caso de sucesso, revalida o cache e retorna a mensagem de sucesso.
  // O redirecionamento será feito no lado do cliente, após exibir o toast.
  revalidatePath("/", "layout");
  return { status: "success", message: "Login bem-sucedido!" };
}

/**
 * Desconecta o usuário e retorna um status.
 * O redirecionamento é tratado no cliente para permitir a exibição de toasts.
 */
export async function logout(): Promise<{
  status: "success";
  message: string;
}> {
  const supabase = createServerClient();
  await supabase.auth.signOut();

  // Revalida o caminho para garantir que a sessão seja limpa no cache
  revalidatePath("/");
  // Retorna uma mensagem de sucesso para o cliente
  return { status: "success", message: "Você saiu com sucesso." };
}
