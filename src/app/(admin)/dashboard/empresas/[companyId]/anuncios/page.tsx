// src/app/(admin)/dashboard/empresas/[companyId]/anuncios/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdvertisementsClient } from "@/components/admin/advertisements/AdvertisementsClient";
import { Advertisement, COMPANY_PUBLIC_COLUMNS, Company } from "@/types";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type Params = Promise<{ companyId: string }>;

// Linha vinda do Supabase com o join M:N
type AdRow = Omit<Advertisement, "companies"> & {
  advertisements_companies?: {
    companies?: Company | null;
  }[];
};

// 👉 Tipo com companies OBRIGATÓRIO (o client exige isso)
type AdvertisementWithCompanies = Omit<Advertisement, "companies"> & {
  companies: Company[];
};

export default async function CompanyAdsPage({ params }: { params: Params }) {
  const { companyId } = await params;
  const supabase = createClient();

  // 1) Empresa para título
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select(COMPANY_PUBLIC_COLUMNS)
    .eq("id", companyId)
    .single<Company>();

  if (companyErr || !company) notFound();

  // 2) Anúncios + relações
  const { data: adsData, error: adsErr } = await supabase
    .from("advertisements")
    .select(
      `*, advertisements_companies:advertisements_companies(companies:companies(${COMPANY_PUBLIC_COLUMNS}))`
    )
    .order("created_at", { ascending: false });

  if (adsErr) {
    throw new Error("Não foi possível carregar os anúncios desta empresa.");
  }

  // 3) Filtra os anúncios ligados à empresa e garante companies: Company[] sempre presente
  const filteredAds: AdvertisementWithCompanies[] = (adsData ?? [])
    .map((row) => row as AdRow)
    .filter((row) =>
      (row.advertisements_companies ?? []).some(
        (rel) => rel?.companies?.id === companyId
      )
    )
    .map((row) => {
      const nested = row.advertisements_companies ?? [];
      const companiesFull = nested
        .map((n) => n?.companies)
        .filter(Boolean) as Company[];

      // remove duplicados
      const companiesUnique = Array.from(
        new Map(companiesFull.map((c) => [c.id, c])).values()
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { advertisements_companies, ...rest } = row;

      return {
        ...rest,
        companies: companiesUnique, // <-- OBRIGATÓRIO
      } as AdvertisementWithCompanies;
    });

  // 4) Lista de empresas para o form continuar permitindo (des)vincular
  const { data: allCompanies, error: compsErr } = await supabase
    .from("companies")
    .select(COMPANY_PUBLIC_COLUMNS)
    .order("name", { ascending: true });

  if (compsErr) {
    throw new Error("Não foi possível carregar a lista de empresas.");
  }

  return (
    <AdvertisementsClient
      initialAdvertisements={filteredAds}
      companies={allCompanies as Company[]}
      title={`Anúncios · ${company.name}`}
      description={`Anúncios exibidos na tela /display/${company.slug}.`}
      defaultCompanyId={company.id}
    />
  );
}
