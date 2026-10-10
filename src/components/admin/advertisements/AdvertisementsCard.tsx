// src/components/admin/advertisements/AdvertisementsCard.tsx
"use client";

import {
  Building2,
  CalendarClock,
  CalendarDays,
  Copy,
  Pencil,
  Timer,
  Trash2,
} from "lucide-react";
import { RowActions } from "@/components/admin/RowActions";
import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { formatWeeklySchedule } from "@/lib/ads/weekly-schedule";
import { formatPeriod } from "@/lib/format";
import { AdvertisementPreview } from "./AdvertisementPreview";
import type { AdvertisementWithCompanies } from "@/types";
import { ScheduleBadge } from "./ScheduleBadge";

type AdHandler = (anuncio: AdvertisementWithCompanies) => void;

interface AdvertisementsCardProps {
  anuncio: AdvertisementWithCompanies;
  /** Sem ações (usuário sem permissão): o card só mostra o anúncio */
  actions?: { onEdit: AdHandler; onDuplicate: AdHandler; onDelete: AdHandler };
}

export function AdvertisementsCard({ anuncio, actions }: AdvertisementsCardProps) {
  const weekly = formatWeeklySchedule(anuncio);
  return (
    <Card
      padding="none"
      radius="lg"
      interactive={!!actions}
      className={`flex flex-col overflow-hidden${actions ? " cursor-pointer" : ""}`}
      onClick={(e) => {
        // Cliques no menu (renderizado em Portal) também sobem até aqui
        if (actions && e.currentTarget.contains(e.target as Node)) {
          actions.onEdit(anuncio);
        }
      }}
    >
      <div className="relative aspect-video bg-muted">
        <AdvertisementPreview
          ad={anuncio}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        <div className="absolute left-2 top-2">
          <ScheduleBadge ad={anuncio} overImage />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[length:var(--lg-text-md)] leading-snug">
            {anuncio.title}
          </h3>
          {actions && (
            <RowActions
              items={[
                {
                  label: "Editar",
                  icon: <Pencil />,
                  onSelect: () => actions.onEdit(anuncio),
                },
                {
                  label: "Duplicar",
                  icon: <Copy />,
                  onSelect: () => actions.onDuplicate(anuncio),
                },
                { type: "separator" },
                {
                  label: "Excluir",
                  icon: <Trash2 />,
                  tone: "danger",
                  onSelect: () => actions.onDelete(anuncio),
                },
              ]}
            />
          )}
        </div>

        <dl className="mt-auto flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Empresas</dt>
            <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <dd className="flex flex-wrap gap-1">
              {anuncio.companies.length ? (
                anuncio.companies.map((empresa) => (
                  <Badge key={empresa.id}>{empresa.name}</Badge>
                ))
              ) : (
                <span>Nenhuma empresa</span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Período</dt>
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <dd>{formatPeriod(anuncio.start_date, anuncio.end_date)}</dd>
          </div>
          {weekly && (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Dias e horários</dt>
              <CalendarClock className="size-4 shrink-0" aria-hidden />
              <dd>{weekly}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <dt className="sr-only">Duração</dt>
            <Timer className="size-4 shrink-0" aria-hidden />
            <dd>{anuncio.duration_seconds}s por exibição</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
