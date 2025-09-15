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

// Action para CRIAR um novo usuário - LÓGICA CORRIGIDA
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

  // 1. Cria o usuário na autenticação. O trigger do banco irá disparar
  //    e criar um perfil básico automaticamente.
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: validation.data.email,
      password: validation.data.password,
      email_confirm: true,
    });

  if (authError) {
    return { success: false, message: { _server: [authError.message] } };
  }

  // 2. AGORA: Em vez de 'insert', nós usamos 'update' para definir
  //    a 'role' e o 'full_name' no perfil que o trigger acabou de criar.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: validation.data.full_name,
      role: validation.data.role,
    })
    .eq("id", authData.user.id); // Encontra o perfil pelo ID do usuário

  if (profileError) {
    // Se a atualização do perfil falhar, é uma boa prática
    // deletar o usuário que acabamos de criar na autenticação para evitar inconsistências.
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { success: false, message: { _server: [profileError.message] } };
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { success: true, message: "Usuário criado com sucesso!" };
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

  // 1. Atualiza o perfil
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name,
      role,
    })
    .eq("id", id);

  if (profileError) {
    return { success: false, message: { _server: [profileError.message] } };
  }

  // 2. Atualiza os dados de autenticação (email e senha, se fornecida)
  const authUpdateData: { email?: string; password?: string } = { email };
  if (password) {
    authUpdateData.password = password;
  }
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    id,
    authUpdateData
  );
  if (authError) {
    return { success: false, message: { _server: [authError.message] } };
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { success: true, message: "Usuário atualizado com sucesso!" };
}

// Action para EXCLUIR um usuário
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; message: string }> {
  if (!userId) {
    return { success: false, message: "ID do usuário não fornecido." };
  }

  // A API de admin.deleteUser retorna { data: { user: User | null }, error }
  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  // Verificação de erro explícito
  if (error) {
    console.error("Erro ao excluir usuário:", error);
    return {
      success: false,
      message: `Falha ao excluir o usuário: ${error.message}`,
    };
  }

  // A VERIFICAÇÃO MAIS IMPORTANTE:
  // Se a exclusão falhar silenciosamente por falta de permissão,
  // o objeto 'data.user' virá como null.
  if (!data.user) {
    console.error(
      "Falha silenciosa ao excluir usuário. Verifique a chave SUPABASE_SERVICE_ROLE_KEY."
    );
    return {
      success: false,
      message:
        "Falha ao excluir o usuário. Verifique as permissões do servidor.",
    };
  }

  revalidatePath("/dashboard/admin/usuarios");
  return { success: true, message: "Usuário excluído com sucesso!" };
}
