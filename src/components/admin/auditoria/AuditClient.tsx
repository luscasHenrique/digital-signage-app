// src/components/admin/auditoria/AuditClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Copy, Search } from "lucide-react";
import type { AuditRow } from "@/types/audit";

/* ---------------- Helpers de formatação/local ---------------- */

type JsonLike = Record<string, unknown> | null;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function entityLabel(table: string): string {
  switch (table) {
    case "advertisements":
      return "Anúncio";
    case "advertisements_companies":
      return "Vínculo Anúncio/Empresa";
    case "companies":
      return "Empresa";
    case "profiles":
      return "Perfil";
    default:
      return table;
  }
}

function humanVerb(action: AuditRow["action"]): string {
  switch (action) {
    case "INSERT":
      return "Criou";
    case "UPDATE":
      return "Atualizou";
    case "DELETE":
      return "Excluiu";
  }
}

function labelForField(key: string): string {
  const map: Record<string, string> = {
    title: "Título",
    description: "Descrição",
    status: "Status",
    type: "Tipo",
    content_url: "Conteúdo",
    thumbnail_url: "Thumbnail",
    start_date: "Início",
    end_date: "Fim",
    duration_seconds: "Duração (s)",
    overlay_text: "Texto do overlay",
    overlay_bg_color: "Cor do fundo",
    overlay_text_color: "Cor do texto",
    overlay_position: "Posição do overlay",
    name: "Nome",
    slug: "Slug",
    is_private: "Privado",
    email: "E-mail",
    full_name: "Nome completo",
    role: "Função",
  };
  return map[key] ?? key;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const maybeDate = Date.parse(v);
    if (!Number.isNaN(maybeDate) && v.includes("T")) {
      try {
        return new Date(v).toLocaleString("pt-BR");
      } catch {}
    }
    return v;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function extractTitle(
  before_data: JsonLike,
  after_data: JsonLike
): string | null {
  const candidates = [after_data, before_data];
  for (const obj of candidates) {
    if (isRecord(obj)) {
      const t = obj.title ?? obj.name;
      if (typeof t === "string" && t.trim()) return t;
    }
  }
  return null;
}

type ChangeLine = { label: string; before: string; after: string };

function computeChanges(
  before_data: JsonLike,
  after_data: JsonLike
): ChangeLine[] {
  const oldObj = isRecord(before_data) ? before_data : {};
  const newObj = isRecord(after_data) ? after_data : {};

  const ignore = new Set([
    "created_at",
    "updated_at",
    "last_edited_by",
    "created_by",
  ]);
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  const lines: ChangeLine[] = [];
  for (const k of keys) {
    if (ignore.has(k)) continue;
    const a = (oldObj as Record<string, unknown>)[k];
    const b = (newObj as Record<string, unknown>)[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      lines.push({
        label: labelForField(k),
        before: formatValue(a),
        after: formatValue(b),
      });
    }
  }
  return lines;
}

/* ---------------- Componente ---------------- */

export default function AuditClient({
  items,
  total,
  page,
  perPage,
  initialFilters,
}: {
  items: AuditRow[];
  total: number;
  page: number;
  perPage: number;
  initialFilters: {
    q: string;
    action: string;
    table: string;
    from: string;
    to: string;
  };
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(initialFilters.q);
  const [action, setAction] = useState(initialFilters.action);
  const [table, setTable] = useState(initialFilters.table);
  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const showingFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(total, page * perPage);

  const applyFilters = (nextPage = 1) => {
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("page", String(nextPage));
    params.set("perPage", String(perPage));
    const filters = { q, action, table, from, to };
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setQ("");
    setAction("");
    setTable("");
    setFrom("");
    setTo("");
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("perPage", String(perPage));
    router.replace(`?${params.toString()}`);
  };

  const changePerPage = (n: number) => {
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("perPage", String(n));
    params.set("page", "1"); // reset para a primeira página
    router.replace(`?${params.toString()}`);
  };

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Auditoria</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {total} registro{total === 1 ? "" : "s"} • página {page} de{" "}
            {totalPages}
          </span>
          <span className="hidden md:inline-block">
            • Exibindo {showingFrom}-{showingTo}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">
                Buscar
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="texto em tabela, email, dados…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button type="button" onClick={() => applyFilters(1)}>
                  <Search className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Tabela
              </label>
              <Input
                placeholder="ex.: advertisements, profiles…"
                value={table}
                onChange={(e) => setTable(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Ação
              </label>
              <Input
                placeholder="INSERT | UPDATE | DELETE"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                De
              </label>
              <Input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Até
              </label>
              <Input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => applyFilters(1)}>
              Aplicar filtros
            </Button>
            <Button variant="ghost" onClick={clearFilters}>
              Limpar
            </Button>

            {/* Itens por página */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Itens por página
              </span>
              <select
                value={perPage}
                onChange={(e) => changePerPage(parseInt(e.target.value, 10))}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 w-[160px]">Quando</th>
              <th className="text-left px-3 py-2 w-[280px]">Usuário</th>
              <th className="text-left px-3 py-2">Resumo</th>
              <th className="text-left px-3 py-2 w-[120px]">Ver</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <AuditRowView key={row.id} row={row} />
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-center px-3 py-6 text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Exibindo {showingFrom}-{showingTo} de {total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(sp?.toString() || "");
              params.set("page", "1");
              params.set("perPage", String(perPage));
              router.replace(`?${params.toString()}`);
            }}
          >
            Primeira
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const prev = Math.max(1, page - 1);
              const params = new URLSearchParams(sp?.toString() || "");
              params.set("page", String(prev));
              params.set("perPage", String(perPage));
              router.replace(`?${params.toString()}`);
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const next = Math.min(totalPages, page + 1);
              const params = new URLSearchParams(sp?.toString() || "");
              params.set("page", String(next));
              params.set("perPage", String(perPage));
              router.replace(`?${params.toString()}`);
            }}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(sp?.toString() || "");
              params.set("page", String(totalPages));
              params.set("perPage", String(perPage));
              router.replace(`?${params.toString()}`);
            }}
          >
            Última
          </Button>
        </div>
      </div>
    </main>
  );
}

function AuditRowView({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);

  const actorName =
    (row.actor?.full_name && row.actor.full_name.trim()) ||
    (row.user_email && row.user_email.trim()) ||
    (row.user_id ? `Usuário ${row.user_id.slice(0, 8)}…` : "—");

  const when = useMemo(() => {
    try {
      const d = new Date(row.created_at);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return row.created_at;
    }
  }, [row.created_at]);

  const entity = entityLabel(row.table_name);
  const verb = humanVerb(row.action);
  const titleCandidate = extractTitle(row.before_data, row.after_data);
  const title = titleCandidate
    ? `${verb} ${entity} “${titleCandidate}”`
    : `${verb} ${entity}`;

  const chips: string[] = [entity];
  if (row.action === "INSERT") chips.push("Novo");
  if (row.action === "UPDATE") chips.push("Edição");
  if (row.action === "DELETE") chips.push("Remoção");

  const changes =
    row.action === "UPDATE"
      ? computeChanges(row.before_data, row.after_data)
      : [];

  const beforePretty = JSON.stringify(row.before_data ?? {}, null, 2);
  const afterPretty = JSON.stringify(row.after_data ?? {}, null, 2);

  return (
    <>
      <tr className="border-t">
        <td className="px-3 py-2 align-top">{when}</td>
        <td className="px-3 py-2 align-top">
          <div className="flex items-center gap-2">
            {row.actor?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.actor.avatar_url}
                alt={actorName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted grid place-items-center text-[10px]">
                {actorName.slice(0, 1)}
              </div>
            )}
            <div className="truncate leading-tight">
              <div className="truncate">{actorName}</div>
              {row.user_email && row.user_email !== actorName && (
                <div className="text-xs text-muted-foreground truncate">
                  {row.user_email}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{row.action}</Badge>
            {chips.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
          <div className="mt-1">{title}</div>
          {row.action === "UPDATE" && (
            <div className="text-xs text-muted-foreground">
              {changes.length > 0
                ? `${changes.length} alteração${changes.length > 1 ? "es" : ""}`
                : "Sem alterações relevantes"}
            </div>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Ocultar" : "Detalhes"}
          </Button>
        </td>
      </tr>

      {open && (
        <tr className="border-t bg-muted/20">
          <td colSpan={4} className="px-3 py-3">
            {row.action === "UPDATE" && changes.length > 0 && (
              <div className="mb-3 rounded-md border bg-background">
                {changes.map((ch) => (
                  <div
                    key={`${row.id}-${ch.label}`}
                    className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border-t first:border-none"
                  >
                    <div className="text-sm font-medium">{ch.label}</div>
                    <div className="text-sm text-muted-foreground line-through break-all">
                      {ch.before}
                    </div>
                    <div className="text-sm break-all">{ch.after}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">Antes</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(beforePretty)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                  {beforePretty}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">Depois</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(afterPretty)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                  {afterPretty}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
