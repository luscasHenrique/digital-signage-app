import { createClient } from "@/lib/supabase/server";
import { COMPANY_PUBLIC_COLUMNS } from "@/types";
import { CompaniesClient } from "@/components/admin/companies/CompaniesClient";

export default async function EmpresasPage() {
  const supabase = createClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select(COMPANY_PUBLIC_COLUMNS)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar empresas:", error);
    throw new Error(
      "Não foi possível carregar os dados das empresas. Por favor, tente novamente mais tarde."
    );
  }

  return <CompaniesClient companies={companies || []} />;
}
