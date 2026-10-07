// src/app/(admin)/dashboard/empresas/[companyId]/anuncios/page.tsx
import { notFound } from "next/navigation";
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import {
  ADS_PER_PAGE,
  getAdvertisementsPage,
  getCompanies,
  parseAdsSearchParams,
} from "@/lib/advertisement-queries";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Anúncios da empresa" };

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CompanyAdsPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; situacao?: string; pagina?: string }>;
}) {
  const { companyId } = await params;
  const filters = parseAdsSearchParams(await searchParams);
  // ID malformado faria a consulta falhar com erro 500 em vez de 404
  if (!UUID_PATTERN.test(companyId)) notFound();
  const supabase = createClient();

  // A lista de empresas também alimenta o formulário (vincular a outras telas)
  const [companies, { ads, total }] = await Promise.all([
    getCompanies(supabase),
    getAdvertisementsPage(supabase, { ...filters, companyId }),
  ]).catch((error) => {
    console.error("Erro ao carregar anúncios da empresa:", error);
    throw new Error("Não foi possível carregar os anúncios desta empresa.");
  });

  const company = companies.find((c) => c.id === companyId);
  if (!company) notFound();

  return (
    <AdvertisementsClient
      advertisements={ads}
      total={total}
      perPage={ADS_PER_PAGE}
      filters={filters}
      companies={companies}
      title={`Anúncios · ${company.name}`}
      description={`Anúncios exibidos na tela /display/${company.slug}.`}
      defaultCompanyId={company.id}
    />
  );
}
