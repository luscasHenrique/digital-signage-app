// src/app/(admin)/dashboard/admin/usuarios/page.tsx
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Profile } from "@/types";
import { UsersClient } from "@/components/admin/users/UsersClient";

// Esta função combina os dados de autenticação com os dados do perfil
async function getUsersWithProfiles() {
  const { data: authUsersResponse, error: authError } =
    await supabaseAdmin.auth.admin.listUsers();
  if (authError) throw new Error(authError.message);

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*");
  if (profilesError) throw new Error(profilesError.message);

  const users = authUsersResponse.users.map((user) => {
    const profile = profiles.find((p) => p.id === user.id) as
      | Profile
      | undefined;
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
