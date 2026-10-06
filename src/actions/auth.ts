// src/actions/auth.ts
"use server";

import { createActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; message: string };

export async function login(formData: FormData): Promise<ActionResult> {
  const supabase = createActionClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

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
    console.error("ERRO NO LOGOUT:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return {
      success: false,
      message: `Falha ao fazer logout: ${errorMessage}`,
    };
  }
}
