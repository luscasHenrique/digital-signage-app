// src/components/admin/advertisements/AdvertisementsClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowUpDown,
  Copy,
  LayoutGrid,
  List,
  Megaphone,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import {
  deleteAdvertisement,
  deleteAdvertisements,
  setAdvertisementsStatus,
} from "@/actions/advertisements";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowActions } from "@/components/admin/RowActions";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Dialog } from "@/components/ui/Dialog/Dialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl/SegmentedControl";
import { Select } from "@/components/ui/Select/Select";
import { Table, type TableColumn } from "@/components/ui/Table/Table";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";
import {
  AD_SCHEDULE_LABEL,
  AD_TYPE_LABEL,
  getAdSchedule,
  type AdSchedule,
} from "@/lib/advertisement-display";
import { formatWeeklySchedule } from "@/lib/ad-weekly-schedule";
import { formatPeriod } from "@/lib/format";
import { normalizeSearch } from "@/lib/search";
import {
  AdvertisementStatus,
  AdvertisementWithCompanies,
  Company,
} from "@/types";
import { AdvertisementForm } from "./AdvertisementForm";
import { AdvertisementPreview } from "./AdvertisementPreview";
import { AdvertisementsCard } from "./AdvertisementsCard";
import { ReorderAdsDialog } from "./ReorderAdsDialog";
import { ScheduleBadge } from "./ScheduleBadge";

interface AdvertisementsClientProps {
  initialAdvertisements: AdvertisementWithCompanies[];
  companies: Company[];
  title?: string;
  description?: string;
  /** Empresa já marcada ao criar um anúncio por aqui */
  defaultCompanyId?: string;
}

const scheduleOptions = [
  { value: "all", label: "Todas as situações" },
  ...(Object.keys(AD_SCHEDULE_LABEL) as AdSchedule[]).map((value) => ({
    value,
    label: AD_SCHEDULE_LABEL[value],
  })),
];

export function AdvertisementsClient({
  initialAdvertisements,
  companies,
  title = "Anúncios",
  description = "Crie, edite e agende o conteúdo das suas telas.",
  defaultCompanyId,
}: AdvertisementsClientProps) {
  const toast = useToast();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [query, setQuery] = useState("");
  const [schedule, setSchedule] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [currentAd, setCurrentAd] = useState<AdvertisementWithCompanies | null>(
    null
  );
  const [duplicating, setDuplicating] = useState(false);
  // Seleção da tabela (ações em lote)
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isBulkPending, startBulkTransition] = useTransition();
  const [adToDelete, setAdToDelete] =
    useState<AdvertisementWithCompanies | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const now = new Date();
    return initialAdvertisements.filter(
      (ad) =>
        (schedule === "all" || getAdSchedule(ad, now) === schedule) &&
        (!q ||
          normalizeSearch(
            `${ad.title} ${ad.companies.map((c) => c.name).join(" ")}`
          ).includes(q))
    );
  }, [initialAdvertisements, query, schedule]);

  const handleOpenModal = (
    ad: AdvertisementWithCompanies | null,
    duplicate = false
  ) => {
    setCurrentAd(ad);
    setDuplicating(duplicate);
    setIsModalOpen(true);
  };

  // Só conta o que ainda existe e está visível no filtro atual
  const selectedIds = selected.filter((id) =>
    filtered.some((ad) => ad.id === id)
  );

  const runBulk = (
    action: () => Promise<{ success: boolean; message: string }>
  ) =>
    startBulkTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        setSelected([]);
      } else {
        toast.error(result.message);
      }
      setConfirmBulkDelete(false);
    });

  const handleDeleteAd = () => {
    if (!adToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteAdvertisement(adToDelete.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message || "Erro ao excluir o anúncio.");
      setAdToDelete(null);
    });
  };

  const actionsFor = (ad: AdvertisementWithCompanies) => [
    { label: "Editar", icon: <Pencil />, onSelect: () => handleOpenModal(ad) },
    {
      label: "Duplicar",
      icon: <Copy />,
      onSelect: () => handleOpenModal(ad, true),
    },
    { type: "separator" as const },
    {
      label: "Excluir",
      icon: <Trash2 />,
      tone: "danger" as const,
      onSelect: () => setAdToDelete(ad),
    },
  ];

  const columns: TableColumn<AdvertisementWithCompanies>[] = [
    {
      key: "title",
      header: "Anúncio",
      sortable: true,
      sortValue: (ad) => ad.title.toLowerCase(),
      cell: (ad) => (
        <div className="flex items-center gap-3">
          <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-[var(--lg-radius-sm)] bg-muted">
            <AdvertisementPreview ad={ad} sizes="80px" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{ad.title}</div>
            <div className="text-sm text-muted-foreground">
              {AD_TYPE_LABEL[ad.type]}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Situação",
      sortable: true,
      sortValue: (ad) => getAdSchedule(ad),
      cell: (ad) => <ScheduleBadge ad={ad} />,
    },
    {
      key: "companies",
      header: "Empresas",
      hideOnMobile: true,
      cell: (ad) => (
        <div className="flex flex-wrap gap-1">
          {ad.companies.map((c) => (
            <Badge key={c.id}>{c.name}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "period",
      header: "Período",
      sortable: true,
      hideOnMobile: true,
      sortValue: (ad) => new Date(ad.end_date),
      cell: (ad) => {
        const weekly = formatWeeklySchedule(ad);
        return (
          <div className="whitespace-nowrap">
            {formatPeriod(ad.start_date, ad.end_date)}
            {weekly && (
              <div className="text-sm text-muted-foreground">{weekly}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      width: 56,
      cell: (ad) => <RowActions items={actionsFor(ad)} />,
    },
  ];

  const bulkActions = selectedIds.length > 0 && (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Ações em lote"
    >
      <span className="text-sm text-muted-foreground">
        {selectedIds.length} selecionado(s)
      </span>
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<Power />}
        disabled={isBulkPending}
        onClick={() =>
          runBulk(() =>
            setAdvertisementsStatus(selectedIds, AdvertisementStatus.ACTIVE)
          )
        }
      >
        Ativar
      </Button>
      <Button
        size="sm"
        variant="secondary"
        leftIcon={<PowerOff />}
        disabled={isBulkPending}
        onClick={() =>
          runBulk(() =>
            setAdvertisementsStatus(selectedIds, AdvertisementStatus.INACTIVE)
          )
        }
      >
        Desativar
      </Button>
      <Button
        size="sm"
        variant="danger"
        leftIcon={<Trash2 />}
        disabled={isBulkPending}
        onClick={() => setConfirmBulkDelete(true)}
      >
        Excluir
      </Button>
    </div>
  );

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <TextField
        type="search"
        size="sm"
        placeholder="Buscar por título ou empresa..."
        aria-label="Buscar anúncios"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        containerClassName="w-full max-w-xs"
      />
      <Select
        size="sm"
        aria-label="Filtrar por situação"
        options={scheduleOptions}
        value={schedule}
        onValueChange={(value) => setSchedule(value ?? "all")}
        containerClassName="w-48"
      />
    </div>
  );

  const emptyMessage =
    query || schedule !== "all"
      ? "Nenhum anúncio encontrado com estes filtros."
      : "Nenhum anúncio cadastrado ainda.";

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <SegmentedControl
              size="sm"
              ariaLabel="Modo de visualização"
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "grid" | "table")}
              items={[
                { value: "grid", icon: <LayoutGrid />, ariaLabel: "Grade" },
                { value: "table", icon: <List />, ariaLabel: "Tabela" },
              ]}
            />
            <Button
              variant="secondary"
              leftIcon={<ArrowUpDown />}
              onClick={() => setIsReorderOpen(true)}
              disabled={initialAdvertisements.length < 2}
            >
              Ordem
            </Button>
            <Button leftIcon={<Plus />} onClick={() => handleOpenModal(null)}>
              Novo anúncio
            </Button>
          </>
        }
      />

      {viewMode === "grid" ? (
        <>
          {filters}
          {filtered.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
              {filtered.map((ad) => (
                <AdvertisementsCard
                  key={ad.id}
                  anuncio={ad}
                  onEdit={(item) => handleOpenModal(item)}
                  onDuplicate={(item) => handleOpenModal(item, true)}
                  onDelete={setAdToDelete}
                />
              ))}
            </div>
          ) : (
            <Card
              variant="strong"
              padding="lg"
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-primary">
                <Megaphone size={22} />
              </span>
              <p className="text-muted-foreground">{emptyMessage}</p>
              {!query && schedule === "all" && (
                <Button
                  leftIcon={<Plus />}
                  onClick={() => handleOpenModal(null)}
                >
                  Criar o primeiro anúncio
                </Button>
              )}
            </Card>
          )}
        </>
      ) : (
        <Table
          columns={columns}
          data={filtered}
          rowKey={(ad) => ad.id}
          pageSize={10}
          selectable
          selected={selectedIds}
          onSelectedChange={setSelected}
          toolbar={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {filters}
              {bulkActions}
            </div>
          }
          empty={emptyMessage}
        />
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        size="lg"
        title={
          duplicating
            ? "Duplicar anúncio"
            : currentAd
              ? "Editar anúncio"
              : "Novo anúncio"
        }
        description={
          currentAd && !duplicating
            ? "Atualize o conteúdo e o período de exibição."
            : "Escolha o conteúdo, as telas e o período de exibição."
        }
      >
        <AdvertisementForm
          key={`${currentAd?.id ?? "new"}-${duplicating}`}
          initialData={currentAd}
          duplicate={duplicating}
          companies={companies}
          defaultCompanyId={defaultCompanyId}
          onSuccess={() => setIsModalOpen(false)}
        />
      </Dialog>

      <ReorderAdsDialog
        open={isReorderOpen}
        onOpenChange={setIsReorderOpen}
        ads={initialAdvertisements}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={`Excluir ${selectedIds.length} anúncio(s)?`}
        description="Os anúncios saem de todas as telas e os arquivos que nenhum outro anúncio usa são apagados. Esta ação não pode ser desfeita."
        confirmLabel="Excluir anúncios"
        loading={isBulkPending}
        onConfirm={() => runBulk(() => deleteAdvertisements(selectedIds))}
      />

      <ConfirmDialog
        open={!!adToDelete}
        onOpenChange={(open) => !open && setAdToDelete(null)}
        title="Excluir anúncio?"
        description={
          <>
            O anúncio <strong>{adToDelete?.title}</strong> sai de todas as telas
            e o arquivo enviado é apagado. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir anúncio"
        loading={isDeletePending}
        onConfirm={handleDeleteAd}
      />
    </>
  );
}
