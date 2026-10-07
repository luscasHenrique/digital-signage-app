// src/app/(admin)/dashboard/admin/erros/page.tsx
import type { Metadata } from "next";
import { ErrorsClient } from "@/components/admin/errors/ErrorsClient";
import { requireAdminPage } from "@/lib/auth";
import { groupErrors, type ErrorLogRow } from "@/lib/errors/format";
import { parsePageParam, sanitizeAuditSearchTerm } from "@/types/audit";

export const metadata: Metadata = { title: "Erros" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;
const SOURCES = ["server", "client", "display"] as const;

export default async function ErrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const { supabase } = await requireAdminPage();
  const sp = await searchParams;
  const page = parsePageParam(sp.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const source = SOURCES.find((s) => s === sp.source) ?? null;
  const q = sanitizeAuditSearchTerm(sp.q);

  let query = supabase
    .from("error_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (source) query = query.eq("source", source);
  if (q) query = query.or(`message.ilike.%${q}%,url.ilike.%${q}%`);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [list, recent] = await Promise.all([
    query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1),
    // Resumo dos 7 dias: só os campos para agrupar
    supabase
      .from("error_logs")
      .select("message, source, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  if (list.error) throw list.error;
  if (recent.error) throw recent.error;

  return (
    <ErrorsClient
      rows={(list.data ?? []) as ErrorLogRow[]}
      total={list.count ?? 0}
      page={page}
      perPage={PER_PAGE}
      q={sp.q ?? ""}
      source={source ?? "all"}
      top={groupErrors(recent.data ?? []).slice(0, 5)}
      last7Days={recent.data?.length ?? 0}
    />
  );
}
