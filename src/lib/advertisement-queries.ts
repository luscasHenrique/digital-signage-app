// src/lib/advertisement-queries.ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AdvertisementWithCompanies,
  COMPANY_PUBLIC_COLUMNS,
  Company,
} from "@/types";

/**
 * Anúncios com as empresas vinculadas. Com `companyId`, o filtro é feito no banco
 * (join interno), sem baixar os anúncios das outras empresas.
 */
export async function getAdvertisementsWithCompanies(
  supabase: SupabaseClient,
  companyId?: string
): Promise<AdvertisementWithCompanies[]> {
  const select = companyId
    ? `*, companies(${COMPANY_PUBLIC_COLUMNS}), link:advertisements_companies!inner(company_id)`
    : `*, companies(${COMPANY_PUBLIC_COLUMNS})`;

  let query = supabase
    .from("advertisements")
    .select(select)
    .order("created_at", { ascending: false });
  if (companyId) query = query.eq("link.company_id", companyId);

  const { data, error } = await query;
  if (error) throw error;

  return (
    (data ?? []) as unknown as (AdvertisementWithCompanies & {
      link?: unknown;
    })[]
  ).map((row) => {
    // "link" é só o join usado no filtro; não vai para a tela
    const ad = { ...row, companies: row.companies ?? [] };
    delete ad.link;
    return ad;
  });
}

export async function getCompanies(
  supabase: SupabaseClient
): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_PUBLIC_COLUMNS)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Company[];
}
