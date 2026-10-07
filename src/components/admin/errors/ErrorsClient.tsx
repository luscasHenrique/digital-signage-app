// src/components/admin/errors/ErrorsClient.tsx
"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bug, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaginationNav } from "@/components/admin/PaginationNav";
import { Accordion } from "@/components/ui/Accordion/Accordion";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { Select } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import {
  ERROR_SOURCE_LABEL,
  type ErrorLogRow,
  type groupErrors,
} from "@/lib/errors/format";

interface ErrorsClientProps {
  rows: ErrorLogRow[];
  total: number;
  page: number;
  perPage: number;
  q: string;
  source: ErrorLogRow["source"] | "all";
  top: ReturnType<typeof groupErrors>;
  last7Days: number;
}

const sourceTone = {
  server: "danger",
  client: "warning",
  display: "accent",
} as const;

const sourceOptions = [
  { value: "all", label: "Todas as origens" },
  ...(Object.keys(ERROR_SOURCE_LABEL) as ErrorLogRow["source"][]).map((value) => ({
    value,
    label: ERROR_SOURCE_LABEL[value],
  })),
];

const dateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR");

export function ErrorsClient({
  rows,
  total,
  page,
  perPage,
  q,
  source,
  top,
  last7Days,
}: ErrorsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const navigate = (changes: Record<string, string | number>) => {
    const params = new URLSearchParams({ q, source, page: String(page) });
    for (const [key, value] of Object.entries(changes)) params.set(key, String(value));
    if (!params.get("q")) params.delete("q");
    if (params.get("source") === "all") params.delete("source");
    if (params.get("page") === "1") params.delete("page");
    router.replace(`${pathname}?${params}`);
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    navigate({ q: query.trim(), page: 1 });
  };

  const items = rows.map((row) => ({
    value: String(row.id),
    title: (
      <span className="flex min-w-0 items-center gap-2">
        <Badge tone={sourceTone[row.source]}>{ERROR_SOURCE_LABEL[row.source]}</Badge>
        <span className="truncate">{row.message}</span>
      </span>
    ),
    subtitle: `${dateTime(row.created_at)}${row.url ? ` · ${row.url}` : ""}`,
    content: (
      <dl className="grid gap-3 text-sm">
        {row.digest && (
          <div>
            <dt className="font-medium">Digest</dt>
            <dd className="font-mono text-muted-foreground">{row.digest}</dd>
          </div>
        )}
        {row.user_agent && (
          <div>
            <dt className="font-medium">Navegador</dt>
            <dd className="text-muted-foreground">{row.user_agent}</dd>
          </div>
        )}
        {row.context != null && (
          <div>
            <dt className="font-medium">Contexto</dt>
            <dd>
              <pre className="overflow-x-auto rounded-[var(--lg-radius-sm)] bg-muted p-2 font-mono text-xs">
                {JSON.stringify(row.context, null, 2)}
              </pre>
            </dd>
          </div>
        )}
        {row.stack && (
          <div>
            <dt className="font-medium">Stack</dt>
            <dd>
              <pre className="max-h-72 overflow-auto rounded-[var(--lg-radius-sm)] bg-muted p-2 font-mono text-xs">
                {row.stack}
              </pre>
            </dd>
          </div>
        )}
      </dl>
    ),
  }));

  return (
    <>
      <PageHeader
        title="Erros"
        description="Falhas do servidor, do painel e das TVs. Guardadas por 30 dias."
      />

      <Card variant="strong" padding="lg" className="flex flex-col gap-3">
        <h2 className="text-[length:var(--lg-text-md)]">
          Mais frequentes nos últimos 7 dias{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({last7Days} no total)
          </span>
        </h2>
        {top.length ? (
          <ol className="flex flex-col gap-2">
            {top.map((group) => (
              <li key={`${group.source}|${group.message}`} className="flex items-center gap-2 text-sm">
                <Badge tone={sourceTone[group.source]}>{ERROR_SOURCE_LABEL[group.source]}</Badge>
                <span className="min-w-0 flex-1 truncate">{group.message}</span>
                <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {group.count}× · último {dateTime(group.last)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 size={16} /> Nenhum erro nos últimos 7 dias.
          </p>
        )}
      </Card>

      <form onSubmit={search} className="flex flex-wrap items-center gap-2" aria-label="Filtros">
        <TextField
          type="search"
          size="sm"
          placeholder="Buscar na mensagem ou no endereço..."
          aria-label="Buscar erros"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="w-full max-w-sm"
        />
        <Select
          size="sm"
          aria-label="Origem"
          options={sourceOptions}
          value={source}
          onValueChange={(value) => navigate({ source: value ?? "all", page: 1 })}
          containerClassName="w-48"
        />
      </form>

      {items.length ? (
        <Accordion type="multiple" variant="separated" headingLevel={2} items={items} />
      ) : (
        <Card variant="strong" padding="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-primary">
            <Bug size={22} />
          </span>
          <p className="text-muted-foreground">Nenhum erro encontrado.</p>
        </Card>
      )}

      <PaginationNav
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => navigate({ page: next })}
        start={`${total} registro(s)`}
      />
    </>
  );
}
