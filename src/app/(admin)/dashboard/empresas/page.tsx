// src/app/(admin)/dashboard/empresas/page.tsx
import { createClient } from "@/lib/supabase/server"; // ATUALIZADO
import { CompaniesClient } from "@/components/admin/companies/CompaniesClient";

export default async function EmpresasPage() {
  const supabase = createClient(); // ATUALIZADO

  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar empresas:", error);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Gerenciamento de Empresas</h1>
        <p className="text-muted-foreground">
          Crie, edite e gerencie as empresas da plataforma.
        </p>
      </div>
      <CompaniesClient companies={companies || []} />
    </div>
  );
}
