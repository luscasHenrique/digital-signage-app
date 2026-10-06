import type { User } from "@supabase/supabase-js";
import { UsersClient } from "@/components/admin/users/UsersClient";
import { requireAdminPage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { UserRole, UserWithProfile } from "@/types";

const PAGE_SIZE = 1000;

/** listUsers é paginado (50 por padrão): percorre todas as páginas. */
async function listAllAuthUsers(): Promise<User[]> {
  const all: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error(`Erro ao buscar usuários: ${error.message}`);
    all.push(...data.users);
    if (data.users.length < PAGE_SIZE) return all;
  }
}

async function getUsersWithProfiles(): Promise<UserWithProfile[]> {
  const [authUsers, { data: profiles, error: profilesError }] =
    await Promise.all([
      listAllAuthUsers(),
      supabaseAdmin.from("profiles").select("id, full_name, role"),
    ]);
  if (profilesError) {
    throw new Error(`Erro ao buscar perfis: ${profilesError.message}`);
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return authUsers.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      full_name: profile?.full_name ?? undefined,
      role: (profile?.role as UserRole | undefined) ?? undefined,
    };
  });
}

export default async function UsuariosPage() {
  await requireAdminPage();
  const users = await getUsersWithProfiles();

  return <UsersClient users={users} />;
}
