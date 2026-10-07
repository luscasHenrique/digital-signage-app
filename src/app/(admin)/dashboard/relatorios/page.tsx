// src/app/(admin)/dashboard/relatorios/page.tsx
import type { Metadata } from "next";
import { ReportsClient } from "@/components/admin/reports/ReportsClient";
import { getCompanies } from "@/lib/advertisement-queries";
import { playDay } from "@/components/display/play-counter";
import {
  aggregatePlays,
  parseDayParam,
  type PlayStatRow,
} from "@/lib/play-report";
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
  let query = supabase
    .from("ad_play_stats")
    .select(
      "day, plays, advertisement_id, company_id, advertisement:advertisements(title, duration_seconds), company:companies(name)"
    )
    .gte("day", from)
    .lte("day", to);
  if (companyId) query = query.eq("company_id", companyId);

  const [{ data, error }, companies] = await Promise.all([
    query,
    getCompanies(supabase),
  ]);
  if (error) throw error;

  const report = aggregatePlays((data ?? []) as unknown as PlayStatRow[]);

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
