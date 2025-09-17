import { createClient } from "@/lib/supabase/server";
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import { Advertisement, Company } from "@/types";

// 1. Definimos um tipo específico para o resultado da nossa query
// Ele é um Anúncio, mas garantimos a forma da propriedade 'companies'
type AdvertisementWithCompaniesQueryResult = Advertisement & {
  companies: Pick<Company, "id" | "name">[] | null;
};

// 2. Adicionamos um tipo de retorno para a função getData
async function getData(): Promise<{
  advertisements: AdvertisementWithCompaniesQueryResult[];
  companies: Company[];
}> {
  const supabase = createClient();

  const { data: advertisements, error: adError } = await supabase
    .from("advertisements")
    .select("*, companies(id, name)")
    .order("created_at", { ascending: false });

  // A query de companies agora busca todos os campos
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("*") // <--- AQUI ESTÁ A CORREÇÃO
    .order("name");

  if (adError || companyError) {
    console.error(
      "Erro ao buscar dados para a página de anúncios:",
      adError || companyError
    );
    throw new Error(
      "Não foi possível carregar os dados dos anúncios. Por favor, tente novamente mais tarde."
    );
  }

  return {
    advertisements:
      (advertisements as AdvertisementWithCompaniesQueryResult[]) || [],
    companies: companies || [],
  };
}

export default async function AnunciosPage() {
  const { advertisements, companies } = await getData();

  // 3. O .map() agora está totalmente tipado, sem precisar de 'any'
  const typedAdvertisements = advertisements.map((ad) => ({
    ...ad,
    companies: ad.companies || [], // Garante que 'companies' seja sempre um array
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Gerenciamento de Anúncios</h1>
        <p className="text-muted-foreground">
          Crie, edite e gerencie os anúncios da plataforma.
        </p>
      </div>
      <AdvertisementsClient
        initialAdvertisements={typedAdvertisements}
        companies={companies as Company[]}
      />
    </div>
  );
}
