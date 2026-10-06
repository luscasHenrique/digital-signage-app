// src/app/(admin)/dashboard/empresas/[companyId]/anuncios/page.tsx
import { notFound } from "next/navigation";
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import {
  getAdvertisementsWithCompanies,
  getCompanies,
} from "@/lib/advertisement-queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CompanyAdsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  // ID malformado faria a consulta falhar com erro 500 em vez de 404
  if (!UUID_PATTERN.test(companyId)) notFound();
  const supabase = createClient();

  // A lista de empresas também alimenta o formulário (vincular a outras telas)
  const [companies, advertisements] = await Promise.all([
    getCompanies(supabase),
    getAdvertisementsWithCompanies(supabase, companyId),
  ]).catch((error) => {
    console.error("Erro ao carregar anúncios da empresa:", error);
    throw new Error("Não foi possível carregar os anúncios desta empresa.");
  });

  const company = companies.find((c) => c.id === companyId);
  if (!company) notFound();

  return (
    <AdvertisementsClient
      initialAdvertisements={advertisements}
      companies={companies}
      title={`Anúncios · ${company.name}`}
      description={`Anúncios exibidos na tela /display/${company.slug}.`}
      defaultCompanyId={company.id}
    />
  );
}
