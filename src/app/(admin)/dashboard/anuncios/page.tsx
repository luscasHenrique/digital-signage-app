import { createClient } from "@/lib/supabase/server"; // PONTO 1: Importa a função correta
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import { Company } from "@/types";

// Função assíncrona que busca os dados no servidor antes de a página ser renderizada.
async function getData() {
  const supabase = createClient(); // PONTO 1: Usa a função correta

  // Usamos um select especial para buscar os anúncios e, para cada um,
  // as empresas associadas através da nossa tabela de junção.
  const { data: advertisements, error: adError } = await supabase
    .from("advertisements")
    .select("*, companies(id, name)") // Busca anúncios e as empresas relacionadas
    .order("created_at", { ascending: false });

  // Também buscamos todas as empresas disponíveis. Iremos usá-las no formulário
  // para permitir que o utilizador escolha onde o anúncio será exibido.
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  if (adError || companyError) {
    console.error(
      "Erro ao buscar dados para a página de anúncios:",
      adError || companyError
    );
  }

  return {
    advertisements: advertisements || [],
    companies: companies || [],
  };
}

export default async function AnunciosPage() {
  const { advertisements, companies } = await getData();

  // PONTO 2: Garantimos que a propriedade 'companies' em cada anúncio seja sempre um array.
  // Isso evita erros de tipo no componente cliente.
  const typedAdvertisements = advertisements.map((ad) => ({
    ...ad,
    companies: ad.companies || [],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Gerenciamento de Anúncios</h1>
        <p className="text-muted-foreground">
          Crie, edite e gerencie os anúncios da plataforma.
        </p>
      </div>
      {/* Passamos os dados pré-carregados do servidor para o componente cliente,
        que irá gerir toda a interatividade da página.
      */}
      <AdvertisementsClient
        initialAdvertisements={typedAdvertisements}
        companies={companies as Company[]}
      />
    </div>
  );
}
