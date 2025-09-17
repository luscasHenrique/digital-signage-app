import { createClient } from "@/lib/supabase/server";
import { AdvertisementStatus } from "@/types";
import { CompanyDisplay } from "@/components/display/CompanyDisplay";

// A tipagem da prop 'params' agora reflete que é uma Promise
interface DisplayPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// A página já é 'async', o que está correto
export default async function DisplayPage({ params }: DisplayPageProps) {
  const supabase = createClient();

  // CORREÇÃO: Usamos 'await' para resolver a Promise e obter o objeto params
  const resolvedParams = await params;
  const companySlug = resolvedParams.slug;

  const now = new Date().toISOString();

  const { data: ads, error } = await supabase
    .from("advertisements")
    .select(
      `
      *,
      advertisements_companies!inner(
        companies!inner(
          slug
        )
      )
    `
    )
    .eq("advertisements_companies.companies.slug", companySlug)
    .eq("status", AdvertisementStatus.ACTIVE)
    .lte("start_date", now)
    .gte("end_date", now);

  if (error) {
    console.error("Erro ao buscar anúncios para display:", error);
    throw new Error("Não foi possível carregar os dados dos anúncios.");
  }

  if (!ads || ads.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
        Nenhum anúncio ativo para esta empresa no momento.
      </div>
    );
  }

  return <CompanyDisplay ads={ads} />;
}
