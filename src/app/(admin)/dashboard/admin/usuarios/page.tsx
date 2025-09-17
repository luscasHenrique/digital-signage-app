import { supabaseAdmin } from "@/lib/supabase/admin";
import { Profile } from "@/types";
import { UsersClient } from "@/components/admin/users/UsersClient";

// Esta função combina os dados de autenticação com os dados do perfil
async function getUsersWithProfiles() {
  const { data: authUsersResponse, error: authError } =
    await supabaseAdmin.auth.admin.listUsers();
  if (authError)
    throw new Error(`Erro ao buscar usuários: ${authError.message}`);

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*");
  if (profilesError)
    throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);

  // MELHORIA: Garante que os dados existem antes de continuar
  if (!authUsersResponse || !profiles) {
    throw new Error(
      "Não foi possível carregar os dados completos dos usuários."
    );
  }

  const users = authUsersResponse.users.map((user) => {
    const profile = profiles.find((p) => p.id === user.id); // 'as' removido para mais segurança de tipo
    return {
      ...user,
      full_name: profile?.full_name,
      role: profile?.role,
    };
  });

  return users;
}

export default async function UsuariosPage() {
  const users = await getUsersWithProfiles();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
      <UsersClient users={users} />
    </div>
  );
}
