// src/app/(admin)/dashboard/relatorios/page.tsx
import type { Metadata } from "next";
import { ReportsClient } from "@/components/admin/reports/ReportsClient";
import { getCompanies } from "@/lib/ads/queries";
import { playDay } from "@/components/display/play-counter";
import {
  buildPlayReport,
  parseDayParam,
  type PlayReportRow,
} from "@/lib/ads/play-report";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; company?: string }>;
}) {
  const params = await searchParams;
  const today = playDay(new Date());
  const to = parseDayParam(params.to, today);
  const from = parseDayParam(
    params.from,
    playDay(new Date(Date.parse(to) - 6 * DAY_MS))
  );
  const companyId = params.company || "";

  const supabase = createClient();
  // Somado no banco: uma linha por anúncio + empresa, qualquer que seja o período
  const [{ data, error }, companies] = await Promise.all([
    supabase.rpc("ad_play_report", {
      p_from: from,
      p_to: to,
      ...(companyId ? { p_company_id: companyId } : {}),
    }),
    getCompanies(supabase),
  ]);
  if (error) throw error;

  const report = buildPlayReport((data ?? []) as PlayReportRow[]);

  return (
    <ReportsClient
      from={from}
      to={to}
      companyId={companyId}
      companies={companies}
      report={report}
    />
  );
}
