// src/actions/users.ts
"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { userFormSchema, type UserFormData } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UserRole } from "@/types";

type FieldErrors = Record<string, string[] | undefined>;
type FormActionResult =
  | { success: true; message: string }
  | { success: false; message: FieldErrors };

const ACCESS_DENIED = "Acesso negado: apenas administradores.";

// Estas actions usam a service role (ignora RLS), então o chamador
// precisa ser verificado como ADMIN antes de qualquer operação.
async function getAdminContext() {
  const ctx = await getAuthContext();
  return ctx?.role === UserRole.ADMIN ? ctx : null;
}

// Action para CRIAR um novo usuário
export async function createUser(data: UserFormData): Promise<FormActionResult> {
  if (!(await getAdminContext())) {
    return { success: false, message: { _server: [ACCESS_DENIED] } };
  }

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

  try {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validation.data.email,
        password: validation.data.password,
        email_confirm: true,
      });

    if (authError) throw authError;

    // A linha em profiles é criada por trigger no banco; aqui completamos os dados.
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
    return { success: false, message: { _server: [errorMessage(error)] } };
  }
}

// Action para ATUALIZAR um usuário existente
export async function updateUser(data: UserFormData): Promise<FormActionResult> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { success: false, message: { _server: [ACCESS_DENIED] } };
  }

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
  if (id === ctx.user.id && role !== UserRole.ADMIN) {
    return {
      success: false,
      message: { role: ["Você não pode remover seu próprio acesso de administrador."] },
    };
  }

  try {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name, role })
      .eq("id", id);

    if (profileError) throw profileError;

    const authUpdateData: { email: string; password?: string } = { email };
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
    return { success: false, message: { _server: [errorMessage(error)] } };
  }
}

// Action para EXCLUIR um usuário
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const ctx = await getAdminContext();
  if (!ctx) return { success: false, message: ACCESS_DENIED };

  if (!userId) {
    return { success: false, message: "ID do usuário não fornecido." };
  }
  if (userId === ctx.user.id) {
    return { success: false, message: "Você não pode excluir a si mesmo." };
  }

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
    return {
      success: false,
      message: `Falha ao excluir o usuário: ${errorMessage(error)}`,
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}
