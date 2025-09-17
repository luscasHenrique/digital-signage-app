// src/actions/auth.ts
"use server";

import { createActionClient } from "@/lib/supabase/server"; // ATUALIZADO
import { revalidatePath } from "next/cache";

export async function login(
  formData: FormData
): Promise<{ status: "error" | "success"; message: string }> {
  const supabase = createActionClient(); // ATUALIZADO

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erro no login:", error.message);
    return {
      status: "error",
      message: "Credenciais inválidas. Tente novamente.",
    };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Login bem-sucedido!" };
}

export async function logout(): Promise<{
  status: "success" | "error"; // O status agora pode ser de erro
  message: string;
}> {
  const supabase = createActionClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Se houver um erro conhecido do Supabase, joga para o catch
      throw error;
    }

    revalidatePath("/");
    return { status: "success", message: "Você saiu com sucesso." };
  } catch (error) {
    console.error("ERRO NO LOGOUT:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return {
      status: "error",
      message: `Falha ao fazer logout: ${errorMessage}`,
    };
  }
}
