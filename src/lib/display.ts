// src/lib/display.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { passwordFingerprint } from "@/lib/password";
import { verifyDisplayToken } from "@/lib/display-token";
import { Advertisement, AdvertisementStatus } from "@/types";

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

/** Anúncios ativos e dentro da janela de exibição para a empresa. */
export async function getActiveAdsForCompany(
  companyId: string
): Promise<Advertisement[]> {
  const { data: links, error: linkErr } = await supabaseAdmin
    .from("advertisements_companies")
    .select("advertisement_id")
    .eq("company_id", companyId);
  if (linkErr) throw linkErr;

  const ids = (links ?? []).map((l) => l.advertisement_id as string);
  if (ids.length === 0) return [];

  const nowIso = new Date().toISOString();
  const { data: ads, error: adsErr } = await supabaseAdmin
    .from("advertisements")
    .select("*")
    .in("id", ids)
    .eq("status", AdvertisementStatus.ACTIVE)
    .lte("start_date", nowIso)
    .gte("end_date", nowIso)
    .order("created_at", { ascending: false });
  if (adsErr) throw adsErr;

  return (ads ?? []) as Advertisement[];
}
