// src/components/admin/companies/CompaniesClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Globe,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { deleteCompany } from "@/actions/companies";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowActions } from "@/components/admin/RowActions";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Dialog } from "@/components/ui/Dialog/Dialog";
import { Table, type TableColumn } from "@/components/ui/Table/Table";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";
import { normalizeSearch } from "@/lib/search";
import { Company } from "@/types";
import { CompanyForm } from "./CompanyForm";

interface CompaniesClientProps {
  companies: Company[];
}

export function CompaniesClient({ companies }: CompaniesClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return companies;
    return companies.filter((c) =>
      normalizeSearch(`${c.name} ${c.slug}`).includes(q)
    );
  }, [companies, query]);

  const handleOpenModal = (company: Company | null) => {
    setCurrentCompany(company);
    setIsModalOpen(true);
  };

  const handleDeleteCompany = () => {
    if (!companyToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteCompany(companyToDelete.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      setCompanyToDelete(null);
    });
  };

  const columns: TableColumn<Company>[] = [
    {
      key: "name",
      header: "Empresa",
      sortable: true,
      sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => <span className="font-semibold">{c.name}</span>,
    },
    {
      key: "slug",
      header: "Endereço da tela",
      cell: (c) => (
        <code className="font-mono text-sm text-muted-foreground">
          /display/{c.slug}
        </code>
      ),
      hideOnMobile: true,
    },
    {
      key: "is_private",
      header: "Visibilidade",
      sortable: true,
      sortValue: (c) => (c.is_private ? 1 : 0),
      cell: (c) =>
        c.is_private ? (
          <Badge tone="accent">
            <Lock size={12} /> Privada
          </Badge>
        ) : (
          <Badge>
            <Globe size={12} /> Pública
          </Badge>
        ),
    },
    {
      key: "created_at",
      header: "Criada em",
      sortable: true,
      sortValue: (c) => new Date(c.created_at),
      cell: (c) => new Date(c.created_at).toLocaleDateString("pt-BR"),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      width: 56,
      cell: (c) => (
        <RowActions
          items={[
            {
              label: "Editar",
              icon: <Pencil />,
              onSelect: () => handleOpenModal(c),
            },
            {
              label: "Gerenciar anúncios",
              icon: <Megaphone />,
              onSelect: () =>
                router.push(`/dashboard/empresas/${c.id}/anuncios`),
            },
            {
              label: "Abrir tela",
              icon: <ExternalLink />,
              onSelect: () => window.open(`/display/${c.slug}`, "_blank"),
            },
            { type: "separator" },
            {
              label: "Excluir",
              icon: <Trash2 />,
              tone: "danger",
              onSelect: () => setCompanyToDelete(c),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Cada empresa tem a sua própria tela de exibição."
        actions={
          <Button leftIcon={<Plus />} onClick={() => handleOpenModal(null)}>
            Nova empresa
          </Button>
        }
      />

      <Table
        columns={columns}
        data={filtered}
        rowKey={(c) => c.id}
        defaultSort={{ key: "name", direction: "asc" }}
        pageSize={10}
        toolbar={
          <TextField
            type="search"
            size="sm"
            placeholder="Buscar por nome ou endereço..."
            aria-label="Buscar empresas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            containerClassName="w-full max-w-xs"
          />
        }
        empty={
          query
            ? "Nenhuma empresa encontrada para esta busca."
            : "Nenhuma empresa cadastrada ainda."
        }
      />

      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={currentCompany ? "Editar empresa" : "Nova empresa"}
        description={
          currentCompany
            ? "Atualize os dados da empresa."
            : "Preencha os dados para criar uma nova empresa."
        }
      >
        <CompanyForm
          key={currentCompany?.id ?? "new"}
          initialData={currentCompany}
          onSuccess={() => setIsModalOpen(false)}
        />
      </Dialog>

      <ConfirmDialog
        open={!!companyToDelete}
        onOpenChange={(open) => !open && setCompanyToDelete(null)}
        title="Excluir empresa?"
        description={
          <>
            A empresa <strong>{companyToDelete?.name}</strong> e a tela dela
            serão removidas. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir empresa"
        loading={isDeletePending}
        onConfirm={handleDeleteCompany}
      />
    </>
  );
}
