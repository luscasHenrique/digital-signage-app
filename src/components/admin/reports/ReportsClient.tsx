// src/components/admin/reports/ReportsClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Clock, Megaphone, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Select } from "@/components/ui/Select/Select";
import { Table, type TableColumn } from "@/components/ui/Table/Table";
import { TextField } from "@/components/ui/TextField/TextField";
import {
  formatDuration,
  type buildPlayReport,
  type PlayReportLine,
} from "@/lib/ads/play-report";
import type { Company } from "@/types";

interface ReportsClientProps {
  from: string;
  to: string;
  companyId: string;
  companies: Company[];
  report: ReturnType<typeof buildPlayReport>;
}

const ALL = "all";

const columns: TableColumn<PlayReportLine>[] = [
  {
    key: "ad",
    header: "Anúncio",
    sortable: true,
    sortValue: (l) => l.adTitle.toLowerCase(),
    cell: (l) => <span className="font-semibold">{l.adTitle}</span>,
  },
  {
    key: "company",
    header: "Tela",
    sortable: true,
    sortValue: (l) => l.companyName.toLowerCase(),
    cell: (l) => l.companyName,
  },
  {
    key: "plays",
    header: "Exibições",
    align: "right",
    sortable: true,
    sortValue: (l) => l.plays,
    cell: (l) => l.plays.toLocaleString("pt-BR"),
  },
  {
    key: "time",
    header: "Tempo de tela",
    align: "right",
    sortable: true,
    sortValue: (l) => l.seconds,
    cell: (l) => formatDuration(l.seconds),
    hideOnMobile: true,
  },
];

export function ReportsClient({
  from,
  to,
  companyId,
  companies,
  report,
}: ReportsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [range, setRange] = useState({ from, to });
  const [company, setCompany] = useState(companyId || ALL);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (company !== ALL) params.set("company", company);
    startTransition(() => router.push(`/dashboard/relatorios?${params}`));
  };

  const cards = [
    {
      label: "Exibições",
      value: report.totalPlays.toLocaleString("pt-BR"),
      icon: <PlayCircle />,
    },
    {
      label: "Tempo de tela",
      value: formatDuration(report.totalSeconds),
      icon: <Clock />,
    },
    { label: "Anúncios exibidos", value: report.ads, icon: <Megaphone /> },
  ];

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Quantas vezes cada anúncio passou em cada tela (horário de Brasília)."
      />

      <form
        onSubmit={apply}
        className="flex flex-wrap items-end gap-3"
        aria-label="Filtros do relatório"
      >
        <TextField
          type="date"
          size="sm"
          label="De"
          value={range.from}
          max={range.to}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
        />
        <TextField
          type="date"
          size="sm"
          label="Até"
          value={range.to}
          min={range.from}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
        />
        <Select
          size="sm"
          label="Tela"
          options={[
            { value: ALL, label: "Todas as telas" },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={company}
          onValueChange={(value) => setCompany(value ?? ALL)}
          containerClassName="w-56"
        />
        <Button type="submit" size="sm" loading={pending}>
          Aplicar
        </Button>
      </form>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {cards.map((card) => (
          <Card key={card.label} radius="lg" className="flex flex-col gap-1.5">
            <span className="mb-1.5 grid size-[38px] place-items-center rounded-[12px] bg-accent-soft text-primary [&_svg]:size-[19px]">
              {card.icon}
            </span>
            <span className="text-sm text-muted-foreground">{card.label}</span>
            <strong className="text-[length:var(--lg-text-2xl)] tracking-[var(--lg-tracking-tight)]">
              {card.value}
            </strong>
          </Card>
        ))}
      </section>

      <Table
        columns={columns}
        data={report.lines}
        rowKey={(l) => l.key}
        defaultSort={{ key: "plays", direction: "desc" }}
        pageSize={20}
        empty="Nenhuma exibição registrada neste período."
      />
    </>
  );
}
