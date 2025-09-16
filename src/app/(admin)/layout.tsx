// src/app/(admin)/layout.tsx
import { createClient } from "@/lib/supabase/server"; // ATUALIZADO AQUI
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";
import { UserNav } from "@/components/admin/UserNav";
import { SidebarNav } from "@/components/admin/SidebarNav";
import Link from "next/link";
import { Package } from "lucide-react";
import { UserRole } from "@/types";

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const supabase = createClient(); // E ATUALIZADO AQUI

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return redirect("/login?message=Erro ao carregar perfil de usuário.");
  }

  const userRole = (profile.role as UserRole) || UserRole.STANDARD;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package className="h-6 w-6" />
              <span className="">Digital Signage</span>
            </Link>
          </div>
          <SidebarNav userRole={userRole} />
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <div className="w-full flex-1" />
          <UserNav user={user} />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
