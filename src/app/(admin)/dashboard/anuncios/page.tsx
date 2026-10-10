// src/app/(admin)/dashboard/anuncios/page.tsx
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import {
  ADS_PER_PAGE,
  getAdvertisementsPage,
  getCompanies,
  parseAdsSearchParams,
} from "@/lib/ads/queries";
import { getPageAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Anúncios" };

export const dynamic = "force-dynamic";

export default async function AnunciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; situacao?: string; pagina?: string }>;
}) {
  const filters = parseAdsSearchParams(await searchParams);
  const supabase = createClient();
  const ctx = await getPageAuthContext();

  const [{ ads, total }, companies] = await Promise.all([
    getAdvertisementsPage(supabase, filters),
    getCompanies(supabase),
  ]).catch((error) => {
    console.error("Erro ao buscar dados para a página de anúncios:", error);
    throw new Error(
      "Não foi possível carregar os dados dos anúncios. Por favor, tente novamente mais tarde."
    );
  });

  return (
    <AdvertisementsClient
      advertisements={ads}
      total={total}
      perPage={ADS_PER_PAGE}
      filters={filters}
      companies={companies}
      canEdit={ctx?.role === UserRole.ADMIN}
    />
  );
}
