// src/app/(admin)/dashboard/anuncios/page.tsx
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import { createServerClient } from "@/lib/supabase/server";
import { Company } from "@/types";

// Função para buscar os anúncios e as empresas disponíveis
async function getData() {
  const supabase = createServerClient();

  const { data: advertisements, error: adError } = await supabase
    .from("advertisements")
    .select("*, companies(id, name)") // Usamos a relação para buscar as empresas vinculadas
    .order("created_at", { ascending: false });

  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  if (adError || companyError) {
    console.error("Erro ao buscar dados:", adError || companyError);
    // Em um app real, poderíamos mostrar um componente de erro aqui
  }

  return {
    advertisements: advertisements || [],
    companies: companies || [],
  };
}

export default async function AnunciosPage() {
  const { advertisements, companies } = await getData();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Gerenciamento de Anúncios</h1>
        <p className="text-muted-foreground">
          Crie, edite e gerencie os anúncios da plataforma.
        </p>
      </div>
      <AdvertisementsClient
        initialAdvertisements={advertisements}
        companies={companies as Company[]}
      />
    </div>
  );
}
