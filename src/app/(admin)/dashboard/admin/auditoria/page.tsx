// src/app/(admin)/dashboard/admin/auditoria/page.tsx
import { requireAdminPage } from "@/lib/auth";
import { Profile } from "@/types";
import AuditClient from "@/components/admin/auditoria/AuditClient";
import { notFound } from "next/navigation";
import {
  AuditLogDB,
  AuditRow,
  SearchParamsAudit,
  buildAuditSearchFilter,
  normalizeDetails,
  parsePageParam,
  sanitizeAuditSearchTerm,
  toAuditAction,
} from "@/types/audit";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Auditoria" };

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsAudit>;
}) {
  const { supabase } = await requireAdminPage();
  const sp = await searchParams;

  const page = parsePageParam(sp.page, 1, 1, Number.MAX_SAFE_INTEGER);
  const perPage = parsePageParam(sp.perPage, 20, 5, 100);
  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  // Base query
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Filtros
  if (sp.table?.trim()) {
    query = query.eq("table_name", sp.table.trim());
  }
  if (sp.action?.trim()) {
    query = query.eq("action", sp.action.trim().toUpperCase());
  }
  // O termo entra na sintaxe do filtro .or() do PostgREST: precisa ser sanitizado.
  const q = sanitizeAuditSearchTerm(sp.q);
  if (q) {
    query = query.or(buildAuditSearchFilter(q));
  }
  if (sp.from) query = query.gte("created_at", sp.from);
  if (sp.to) query = query.lte("created_at", sp.to);

  // Paginação
  const { data: rows, error, count } = await query.range(fromIdx, toIdx);
  if (error) {
    if ((error as { code?: string }).code === "PGRST116") notFound();
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Auditoria</h1>
        <p className="text-red-600">Erro ao carregar logs: {error.message}</p>
      </main>
    );
  }

  const logs = (rows ?? []) as AuditLogDB[];

  // Resolve nomes/avatars (profiles)
  const userIds = Array.from(
    new Set(logs.map((l) => l.user_id).filter(Boolean))
  ) as string[];

  let profilesById: Record<
    string,
    Pick<Profile, "id" | "full_name" | "avatar_url">
  > = {};

  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    if (profs) {
      profilesById = Object.fromEntries(
        profs.map((p) => [
          p.id,
          p as Pick<Profile, "id" | "full_name" | "avatar_url">,
        ])
      );
    }
  }

  // Monta items do cliente com tipos centralizados
  const items: AuditRow[] = logs.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    action: toAuditAction(l.action),
    table_name: l.table_name,
    record_pk: l.record_pk,
    user_id: l.user_id,
    user_email: l.user_email,
    before_data: normalizeDetails(l.before_data),
    after_data: normalizeDetails(l.after_data),
    actor: l.user_id ? (profilesById[l.user_id] ?? null) : null,
  }));

  return (
    <AuditClient
      items={items}
      total={count ?? 0}
      page={page}
      perPage={perPage}
      initialFilters={{
        q: sp.q ?? "",
        action: sp.action ?? "",
        table: sp.table ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
