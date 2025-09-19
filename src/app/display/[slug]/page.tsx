// src/app/display/[slug]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Advertisement, AdvertisementStatus, Company } from "@/types";
import { CompanyDisplay } from "@/components/display/CompanyDisplay";

export const revalidate = 0; // sem cache
export const dynamic = "force-dynamic"; // SSR dinâmico

interface DisplayPageProps {
  // Next.js 15: params é uma Promise
  params: Promise<{
    slug: string;
  }>;
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const supabase = createClient();

  // ✅ aguarde os params antes de acessar propriedades
  const { slug } = await params;

  // 1) Empresa pelo slug
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("slug", slug)
    .single<Company>();

  if (companyErr || !company) {
    notFound();
  }

  const nowIso = new Date().toISOString();

  // 2) IDs de anúncios vinculados à empresa
  const { data: links, error: linkErr } = await supabase
    .from("advertisements_companies")
    .select("advertisement_id")
    .eq("company_id", company.id);

  if (linkErr) {
    console.error("Erro ao buscar vínculos:", linkErr);
    return (
      <main className="h-screen w-screen bg-black grid place-items-center text-white">
        Erro ao carregar vínculos de anúncios.
      </main>
    );
  }

  const ids = (links ?? []).map((l) => l.advertisement_id) as string[];

  // 3) Anúncios válidos para exibição agora
  let ads: Advertisement[] = [];
  if (ids.length > 0) {
    const { data: adsData, error: adsErr } = await supabase
      .from("advertisements")
      .select("*")
      .in("id", ids)
      .eq("status", AdvertisementStatus.ACTIVE)
      .lte("start_date", nowIso)
      .gte("end_date", nowIso)
      .order("created_at", { ascending: false });

    if (adsErr) {
      console.error("Erro ao buscar anúncios:", adsErr);
    } else {
      ads = (adsData ?? []) as Advertisement[];
    }
  }

  if (ads.length === 0) {
    return (
      <main className="h-screen w-screen bg-black flex items-center justify-center text-white">
        Nenhum anúncio ativo para esta empresa no momento.
      </main>
    );
  }

  // 4) Passa companyId para ativar o Realtime no client
  return (
    <CompanyDisplay
      ads={ads}
      companyId={company.id}
      animationType="slideFromRight"
    />
  );
}
