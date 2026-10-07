// src/lib/display.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { passwordFingerprint } from "@/lib/password";
import { verifyDisplayToken } from "@/lib/display-token";
import { AdvertisementStatus, DISPLAY_AD_COLUMNS, type DisplayAd } from "@/types";

// Dados de display são lidos com service role para que as tabelas
// não precisem de leitura pública (anon) no RLS. O acesso é decidido aqui.

export interface DisplayCompany {
  id: string;
  name: string;
  slug: string;
  is_private: boolean;
  password: string | null;
}

export async function getDisplayCompany(
  slug: string
): Promise<DisplayCompany | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, slug, is_private, password")
    .eq("slug", slug)
    .maybeSingle<DisplayCompany>();

  if (error) throw error;
  return data;
}

export async function hasDisplayAccess(
  company: DisplayCompany,
  token: string | undefined
): Promise<boolean> {
  if (!company.is_private) return true;
  return verifyDisplayToken(
    token,
    company.slug,
    passwordFingerprint(company.password)
  );
}

/**
 * Anúncios ativos e dentro da janela de exibição para a empresa.
 * Uma consulta só: o vínculo com a empresa entra como inner join de filtro.
 */
export async function getActiveAdsForCompany(
  companyId: string
): Promise<DisplayAd[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("advertisements")
    .select(`${DISPLAY_AD_COLUMNS}, link:advertisements_companies!inner(company_id)`)
    .eq("link.company_id", companyId)
    .eq("status", AdvertisementStatus.ACTIVE)
    .lte("start_date", nowIso)
    .gte("end_date", nowIso)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // `link` só serve de filtro; o player não precisa dele
  return (data ?? []).map((row) => {
    const ad: Record<string, unknown> = { ...row };
    delete ad.link;
    return ad as DisplayAd;
  });
}
