// src/actions/users.ts
"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const userFormSchema = z.object({
  id: z.string().optional(),
  full_name: z
    .string()
    .min(3, "O nome completo é obrigatório.")
    .optional()
    .or(z.literal("")),
  email: z.string().email("O e-mail fornecido é inválido."),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .optional()
    .or(z.literal("")),
  role: z.nativeEnum(UserRole),
});

type UserFormData = z.infer<typeof userFormSchema>;

// Action para CRIAR um novo usuário
export async function createUser(data: UserFormData) {
  const validation = userFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }
  if (!validation.data.password) {
    return {
      success: false,
      message: { password: ["A senha é obrigatória para novos usuários."] },
    };
  }

  // Adicionado try...catch para a operação completa
  try {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validation.data.email,
        password: validation.data.password,
        email_confirm: true,
      });

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: validation.data.full_name,
        role: validation.data.role,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      // Se a atualização do perfil falhar, deleta o usuário recém-criado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    revalidatePath("/dashboard/admin/usuarios");
    return { success: true, message: "Usuário criado com sucesso!" };
  } catch (error) {
    console.error("ERRO AO CRIAR USUÁRIO:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return { success: false, message: { _server: [errorMessage] } };
  }
}

// Action para ATUALIZAR um usuário existente
export async function updateUser(data: UserFormData) {
  const validation = userFormSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const { id, full_name, email, password, role } = validation.data;
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID do usuário não fornecido."] },
    };
  }

  // Adicionado try...catch para a operação completa
  try {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, role })
      .eq("id", id);

    if (profileError) throw profileError;

    const authUpdateData: { email?: string; password?: string } = { email };
    if (password) {
      authUpdateData.password = password;
    }
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      authUpdateData
    );
    if (authError) throw authError;

    revalidatePath("/dashboard/admin/usuarios");
    return { success: true, message: "Usuário atualizado com sucesso!" };
  } catch (error) {
    console.error("ERRO AO ATUALIZAR USUÁRIO:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return { success: false, message: { _server: [errorMessage] } };
  }
}

// Action para EXCLUIR um usuário
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: "ID do usuário não fornecido." };
  }

  // Adicionado try...catch para a operação completa
  try {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) throw error;

    // Verificação de falha silenciosa
    if (!data.user) {
      throw new Error(
        "Falha silenciosa ao excluir usuário. Verifique as permissões do servidor."
      );
    }

    revalidatePath("/dashboard/admin/usuarios");
    return { success: true, message: "Usuário excluído com sucesso!" };
  } catch (error) {
    console.error("ERRO AO EXCLUIR USUÁRIO:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      success: false,
      message: `Falha ao excluir o usuário: ${errorMessage}`,
    };
  }
}
