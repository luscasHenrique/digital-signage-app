// src/lib/display/data.ts
import "server-only";

import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { passwordFingerprint } from "@/lib/security/password";
import { verifyDisplayToken } from "@/lib/display/token";
import {
  AdvertisementStatus,
  DISPLAY_AD_COLUMNS,
  type DisplayAd,
  type DisplaySettings,
  type DisplayTransition,
} from "@/types";

// Dados de display são lidos com service role para que as tabelas
// não precisem de leitura pública (anon) no RLS. O acesso é decidido aqui.

export interface DisplayCompany {
  id: string;
  name: string;
  slug: string;
  is_private: boolean;
  password: string | null;
  transition: DisplayTransition;
  show_clock: boolean;
}

export function displaySettings(company: DisplayCompany): DisplaySettings {
  return { transition: company.transition, showClock: company.show_clock };
}

/** Deduplicado por requisição (metadata + página buscam a mesma empresa). */
export const getDisplayCompany = cache(async function getDisplayCompany(
  slug: string
): Promise<DisplayCompany | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, slug, is_private, password, transition, show_clock")
    .eq("slug", slug)
    .maybeSingle<DisplayCompany>();

  if (error) throw error;
  return data;
});

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
 * Anúncios ativos e dentro do período para a empresa, na ordem do painel.
 * Uma consulta só: o vínculo com a empresa entra como inner join de filtro.
 * Dias/horários da programação semanal são aplicados pelo player.
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
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;

  // `link` só serve de filtro; o player não precisa dele
  return (data ?? []).map((row) => {
    const ad: Record<string, unknown> = { ...row };
    delete ad.link;
    return ad as DisplayAd;
  });
}

/**
 * Registra que o display desta empresa está no ar (status no painel).
 * Falha aqui nunca derruba a exibição.
 */
export async function recordDisplayHeartbeat(
  companyId: string,
  userAgent: string | null
): Promise<void> {
  const { error } = await supabaseAdmin.from("display_heartbeats").upsert({
    company_id: companyId,
    last_seen_at: new Date().toISOString(),
    user_agent: userAgent?.slice(0, 300) ?? null,
  });
  if (error) console.warn("Falha ao registrar contato do display:", error);
}
