// src/lib/ads/queries.ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdSchedule } from "@/lib/ads/advertisement";
import { sanitizeAuditSearchTerm } from "@/types/audit";
import type { Database } from "@/types/database";
import {
  AdvertisementStatus,
  AdvertisementWithCompanies,
  COMPANY_PUBLIC_COLUMNS,
  Company,
} from "@/types";

type Client = SupabaseClient<Database>;

export const ADS_PER_PAGE = 24;

/** Situações que o filtro resolve no banco ("fora do horário" fica em "No ar"). */
export type AdScheduleFilter = Exclude<AdSchedule, "offHours"> | "all";

export type AdsPageParams = {
  companyId?: string;
  q?: string;
  schedule?: AdScheduleFilter;
  page?: number;
  perPage?: number;
};

// "!advertisements_companies": há outro caminho anúncio↔empresa
// (ad_play_stats) e o PostgREST exige dizer qual usar
const COMPANIES_EMBED = `companies!advertisements_companies(${COMPANY_PUBLIC_COLUMNS})`;

/**
 * Uma página de anúncios com as empresas vinculadas, já filtrada no banco.
 * Com `companyId`, só os anúncios daquela tela (join interno).
 */
export async function getAdvertisementsPage(
  supabase: Client,
  { companyId, q, schedule = "all", page = 1, perPage = ADS_PER_PAGE }: AdsPageParams
): Promise<{ ads: AdvertisementWithCompanies[]; total: number }> {
  const select = companyId
    ? `*, ${COMPANIES_EMBED}, link:advertisements_companies!inner(company_id)`
    : `*, ${COMPANIES_EMBED}`;

  let query = supabase
    .from("advertisements")
    .select(select, { count: "exact" })
    // Mesma ordem do display
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (companyId) query = query.eq("link.company_id", companyId);

  const nowIso = new Date().toISOString();
  const active = AdvertisementStatus.ACTIVE;
  if (schedule === "inactive") query = query.neq("status", active);
  if (schedule === "live") {
    query = query.eq("status", active).lte("start_date", nowIso).gte("end_date", nowIso);
  }
  if (schedule === "scheduled") query = query.eq("status", active).gt("start_date", nowIso);
  if (schedule === "expired") query = query.eq("status", active).lt("end_date", nowIso);

  // Busca pelo título ou pelo nome de uma empresa vinculada
  const term = sanitizeAuditSearchTerm(q);
  if (term) {
    const linkedIds = await adIdsOfCompaniesMatching(supabase, term);
    const byCompany = linkedIds.length ? `,id.in.(${linkedIds.join(",")})` : "";
    query = query.or(`title.ilike.%${term}%${byCompany}`);
  }

  const from = (page - 1) * perPage;
  const { data, error, count } = await query.range(from, from + perPage - 1);
  if (error) throw error;

  const ads = (
    (data ?? []) as unknown as (AdvertisementWithCompanies & { link?: unknown })[]
  ).map((row) => {
    // "link" é só o join usado no filtro; não vai para a tela
    const ad = { ...row, companies: row.companies ?? [] };
    delete ad.link;
    return ad;
  });
  return { ads, total: count ?? 0 };
}

async function adIdsOfCompaniesMatching(supabase: Client, term: string) {
  const { data, error } = await supabase
    .from("advertisements_companies")
    .select("advertisement_id, company:companies!inner(name)")
    .ilike("company.name", `%${term}%`)
    .limit(500);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.advertisement_id)));
}

/** Campos que o diálogo "Ordem" usa (lista completa, sem paginação). */
export const ORDER_LIST_COLUMNS =
  "id, title, type, content_url, thumbnail_url, status, start_date, end_date, weekdays, daily_start, daily_end";

export async function getCompanies(supabase: Client): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_PUBLIC_COLUMNS)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Company[];
}

/** Lê os parâmetros da URL da lista de anúncios. */
export function parseAdsSearchParams(sp: {
  q?: string;
  situacao?: string;
  pagina?: string;
}): Required<Pick<AdsPageParams, "q" | "schedule" | "page">> {
  const schedules: AdScheduleFilter[] = ["all", "live", "scheduled", "expired", "inactive"];
  const page = Number.parseInt(sp.pagina ?? "", 10);
  return {
    q: (sp.q ?? "").slice(0, 100),
    schedule: schedules.find((s) => s === sp.situacao) ?? "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}
