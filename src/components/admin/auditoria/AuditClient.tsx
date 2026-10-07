// src/components/admin/auditoria/AuditClient.tsx
"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  History,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaginationNav } from "@/components/admin/PaginationNav";
import {
  Accordion,
  type AccordionItem,
} from "@/components/ui/Accordion/Accordion";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { DatePicker } from "@/components/ui/DatePicker/DatePicker";
import type { DateRange } from "@/components/ui/DatePicker/date-utils";
import { Select } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";
import { endOfDay, startOfDay } from "@/lib/advertisement-display";
import {
  AUDIT_ACTION_LABEL,
  AUDIT_TABLE_LABEL,
  computeChanges,
  entityLabel,
  redactSecrets,
  summarizeAudit,
} from "@/lib/audit-format";
import type { AuditAction, AuditRow } from "@/types/audit";

type Filters = {
  q: string;
  action: string;
  table: string;
  from: string;
  to: string;
};

const actionTone: Record<AuditAction, "success" | "accent" | "danger"> = {
  INSERT: "success",
  UPDATE: "accent",
  DELETE: "danger",
};

const actionIcon: Record<AuditAction, ReactNode> = {
  INSERT: <Plus />,
  UPDATE: <Pencil />,
  DELETE: <Minus />,
};

// O Select trata "" como "sem valor"; "Todas" usa um valor próprio
const ALL = "all";

const tableOptions = [
  { value: ALL, label: "Todas as áreas" },
  ...Object.entries(AUDIT_TABLE_LABEL).map(([value, label]) => ({
    value,
    label,
  })),
];

const actionOptions = [
  { value: ALL, label: "Todas as ações" },
  ...(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]).map((value) => ({
    value,
    label: AUDIT_ACTION_LABEL[value],
  })),
];

const perPageOptions = [10, 20, 50, 100].map((n) => ({
  value: String(n),
  label: `${n} por página`,
}));

const whenFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function toRange(from: string, to: string): DateRange {
  return {
    from: from ? new Date(from) : null,
    to: to ? new Date(to) : null,
  };
}

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
  initialFilters: Filters;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const showingFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(total, page * perPage);
  const hasFilters = Object.values(initialFilters).some(Boolean);

  const navigate = (changes: Record<string, string | number>) => {
    const params = new URLSearchParams(sp?.toString() || "");
    params.set("perPage", String(perPage));
    for (const [key, value] of Object.entries(changes)) {
      if (value === "" || value === undefined) params.delete(key);
      else params.set(key, String(value));
    }
    router.replace(`?${params.toString()}`);
  };

  const applyFilters = (next: Filters = filters) =>
    navigate({ ...next, page: 1 });

  const update = (patch: Partial<Filters>, apply = false) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (apply) applyFilters(next);
  };

  const clearFilters = () => {
    const empty: Filters = { q: "", action: "", table: "", from: "", to: "" };
    setFilters(empty);
    applyFilters(empty);
  };

  const accordionItems: AccordionItem[] = items.map((row) => ({
    value: String(row.id),
    icon: (
      <span
        className="grid size-8 place-items-center rounded-full [&_svg]:size-4"
        style={{
          background: `var(--lg-${actionTone[row.action]}-soft)`,
          color: `var(--lg-${actionTone[row.action]})`,
        }}
      >
        {actionIcon[row.action]}
      </span>
    ),
    title: summarizeAudit(
      row.action,
      row.table_name,
      row.before_data,
      row.after_data
    ),
    subtitle: `${actorName(row)} · ${whenFormat.format(new Date(row.created_at))}`,
    meta: (
      <Badge tone={actionTone[row.action]}>{entityLabel(row.table_name)}</Badge>
    ),
    content: <AuditDetails row={row} />,
  }));

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Histórico de tudo o que foi criado, alterado ou excluído."
      />

      <Card variant="strong" radius="lg" className="flex flex-col gap-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
        >
          <TextField
            type="search"
            label="Buscar"
            placeholder="E-mail, título, valores..."
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            onClear={() => update({ q: "" }, true)}
          />
          <Select
            label="Área"
            options={tableOptions}
            value={filters.table || ALL}
            onValueChange={(value) =>
              update({ table: value === ALL ? "" : (value ?? "") }, true)
            }
          />
          <Select
            label="Ação"
            options={actionOptions}
            value={filters.action || ALL}
            onValueChange={(value) =>
              update({ action: value === ALL ? "" : (value ?? "") }, true)
            }
          />
          <DatePicker
            mode="range"
            label="Período"
            placeholder="Qualquer data"
            clearable
            value={toRange(filters.from, filters.to)}
            onValueChange={(range) => {
              // Só aplica com o período completo (ou quando for limpo)
              if (range.from && !range.to) return;
              update(
                {
                  from: range.from ? startOfDay(range.from).toISOString() : "",
                  to: range.to ? endOfDay(range.to).toISOString() : "",
                },
                true
              );
            }}
          />
          {/* Enter no campo de busca aplica os filtros */}
          <button type="submit" hidden />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {total} registro{total === 1 ? "" : "s"}
            {total > 0 && ` · exibindo ${showingFrom}–${showingTo}`}
          </span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw />}
              onClick={clearFilters}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {accordionItems.length > 0 ? (
        <Accordion
          type="multiple"
          variant="separated"
          headingLevel={2}
          items={accordionItems}
        />
      ) : (
        <Card
          variant="strong"
          padding="lg"
          className="flex flex-col items-center gap-3 text-center"
        >
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-primary">
            <History size={22} />
          </span>
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        </Card>
      )}

      <PaginationNav
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => navigate({ page: next })}
        start={
          <Select
            size="sm"
            aria-label="Itens por página"
            options={perPageOptions}
            value={String(perPage)}
            onValueChange={(value) =>
              value && navigate({ perPage: value, page: 1 })
            }
            containerClassName="w-40"
          />
        }
      />
    </>
  );
}

function actorName(row: AuditRow): string {
  return (
    row.actor?.full_name?.trim() ||
    row.user_email?.trim() ||
    (row.user_id ? `Usuário ${row.user_id.slice(0, 8)}…` : "Sistema")
  );
}

function AuditDetails({ row }: { row: AuditRow }) {
  const toast = useToast();
  const changes =
    row.action === "UPDATE"
      ? computeChanges(row.before_data, row.after_data)
      : [];

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência.");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Avatar
          name={actorName(row)}
          src={row.actor?.avatar_url ?? undefined}
          size={24}
        />
        <span>{actorName(row)}</span>
        {row.user_email && row.user_email !== actorName(row) && (
          <span className="text-muted-foreground">({row.user_email})</span>
        )}
      </div>

      {row.action === "UPDATE" &&
        (changes.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--lg-radius-md)] border border-border">
            {changes.map((ch) => (
              <div
                key={ch.key}
                className="grid gap-1 border-t border-border p-3 text-sm first:border-t-0 md:grid-cols-[160px_1fr_1fr] md:gap-3"
              >
                <div className="font-semibold">{ch.label}</div>
                <div className="break-all text-muted-foreground line-through">
                  {ch.before}
                </div>
                <div className="break-all">{ch.after}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem alterações relevantes.
          </p>
        ))}

      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["Antes", row.before_data],
            ["Depois", row.after_data],
          ] as const
        ).map(([label, data]) => {
          const pretty = JSON.stringify(redactSecrets(data) ?? {}, null, 2);
          return (
            <div key={label} className="min-w-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold">{label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Copy />}
                  onClick={() => copy(pretty)}
                >
                  Copiar
                </Button>
              </div>
              <pre className="max-h-72 overflow-auto rounded-[var(--lg-radius-md)] bg-[var(--lg-code-bg)] p-3 font-mono text-xs">
                {pretty}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
