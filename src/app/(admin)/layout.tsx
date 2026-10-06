// src/app/(admin)/layout.tsx
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return redirect("/login?message=Erro ao carregar perfil de usuário.");
  }

  const userRole =
    profile.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.STANDARD;

  return (
    <AdminShell
      userRole={userRole}
      userName={profile.full_name || user.email || "Usuário"}
      userEmail={user.email ?? ""}
    >
      {children}
    </AdminShell>
  );
}
