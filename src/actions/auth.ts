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
  status: "success";
  message: string;
}> {
  const supabase = createActionClient(); // ATUALIZADO
  await supabase.auth.signOut();

  revalidatePath("/");
  return { status: "success", message: "Você saiu com sucesso." };
}
