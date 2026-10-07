// src/app/(admin)/dashboard/anuncios/page.tsx
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import {
  getAdvertisementsWithCompanies,
  getCompanies,
} from "@/lib/advertisement-queries";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Anúncios" };

export const dynamic = "force-dynamic";

export default async function AnunciosPage() {
  const supabase = createClient();

  const [advertisements, companies] = await Promise.all([
    getAdvertisementsWithCompanies(supabase),
    getCompanies(supabase),
  ]).catch((error) => {
    console.error("Erro ao buscar dados para a página de anúncios:", error);
    throw new Error(
      "Não foi possível carregar os dados dos anúncios. Por favor, tente novamente mais tarde."
    );
  });

  return (
    <AdvertisementsClient
      initialAdvertisements={advertisements}
      companies={companies}
    />
  );
}
