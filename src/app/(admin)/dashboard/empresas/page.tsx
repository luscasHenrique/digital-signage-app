import { createClient } from "@/lib/supabase/server";
import { CompaniesClient } from "@/components/admin/companies/CompaniesClient";

export default async function EmpresasPage() {
  const supabase = createClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("*")
    .order("name", { ascending: true });

  // CORREÇÃO: Lança um erro para ativar o error.tsx
  if (error) {
    console.error("Erro ao buscar empresas:", error);
    // Esta linha irá parar a renderização da página e mostrar o seu error.tsx
    throw new Error(
      "Não foi possível carregar os dados das empresas. Por favor, tente novamente mais tarde."
    );
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
