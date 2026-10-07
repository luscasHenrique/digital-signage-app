import { createClient } from "@/lib/supabase/server";
import { COMPANY_PUBLIC_COLUMNS, type CompanyWithStatus } from "@/types";
import { CompaniesClient } from "@/components/admin/companies/CompaniesClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Empresas" };

export default async function EmpresasPage() {
  const supabase = createClient();

  const { data: companies, error } = await supabase
    .from("companies")
    // display_heartbeats é 1:1 com a empresa: vem como objeto (ou null)
    .select(`${COMPANY_PUBLIC_COLUMNS}, heartbeat:display_heartbeats(last_seen_at)`)
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar empresas:", error);
    throw new Error(
      "Não foi possível carregar os dados das empresas. Por favor, tente novamente mais tarde."
    );
  }

  return (
    <CompaniesClient
      companies={(companies ?? []) as unknown as CompanyWithStatus[]}
    />
  );
}
