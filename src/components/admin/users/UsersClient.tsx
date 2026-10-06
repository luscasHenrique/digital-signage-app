// src/components/admin/users/UsersClient.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUser } from "@/actions/users";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { RowActions } from "@/components/admin/RowActions";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { Dialog } from "@/components/ui/Dialog/Dialog";
import { Table, type TableColumn } from "@/components/ui/Table/Table";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";
import { normalizeSearch } from "@/lib/search";
import { UserRole, UserWithProfile } from "@/types";
import { UserForm } from "./UserForm";

interface UsersClientProps {
  users: UserWithProfile[];
}

export function UsersClient({ users }: UsersClientProps) {
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(
    null
  );
  const [isDeletePending, startDeleteTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return users;
    return users.filter((u) =>
      normalizeSearch(`${u.full_name ?? ""} ${u.email ?? ""}`).includes(q)
    );
  }, [users, query]);

  const handleOpenModal = (user: UserWithProfile | null) => {
    setCurrentUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteUser(userToDelete.id);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      setUserToDelete(null);
    });
  };

  const columns: TableColumn<UserWithProfile>[] = [
    {
      key: "full_name",
      header: "Usuário",
      sortable: true,
      sortValue: (u) => (u.full_name || u.email || "").toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name || u.email} size={34} />
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {u.full_name || "Sem nome"}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              {u.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Função",
      sortable: true,
      sortValue: (u) => u.role ?? "",
      cell: (u) =>
        !u.role ? (
          <Badge tone="warning">Sem perfil</Badge>
        ) : u.role === UserRole.ADMIN ? (
          <Badge tone="accent">Administrador</Badge>
        ) : (
          <Badge>Padrão</Badge>
        ),
    },
    {
      key: "created_at",
      header: "Criado em",
      sortable: true,
      sortValue: (u) => new Date(u.created_at),
      cell: (u) => new Date(u.created_at).toLocaleDateString("pt-BR"),
      hideOnMobile: true,
    },
    {
      key: "actions",
      header: <span className="sr-only">Ações</span>,
      align: "right",
      width: 56,
      cell: (u) => (
        <RowActions
          items={[
            {
              label: "Editar",
              icon: <Pencil />,
              onSelect: () => handleOpenModal(u),
            },
            { type: "separator" },
            {
              label: "Excluir",
              icon: <Trash2 />,
              tone: "danger",
              onSelect: () => setUserToDelete(u),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Quem pode acessar o painel e com qual permissão."
        actions={
          <Button leftIcon={<Plus />} onClick={() => handleOpenModal(null)}>
            Novo usuário
          </Button>
        }
      />

      <Table
        columns={columns}
        data={filtered}
        rowKey={(u) => u.id}
        defaultSort={{ key: "full_name", direction: "asc" }}
        pageSize={10}
        toolbar={
          <TextField
            type="search"
            size="sm"
            placeholder="Buscar por nome ou e-mail..."
            aria-label="Buscar usuários"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            containerClassName="w-full max-w-xs"
          />
        }
        empty={
          query
            ? "Nenhum usuário encontrado para esta busca."
            : "Nenhum usuário cadastrado."
        }
      />

      <Dialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={currentUser ? "Editar usuário" : "Novo usuário"}
        description={
          currentUser
            ? "Atualize os dados do usuário."
            : "Preencha os dados para criar um novo usuário."
        }
      >
        <UserForm
          key={currentUser?.id ?? "new"}
          initialData={currentUser}
          onSuccess={() => setIsModalOpen(false)}
        />
      </Dialog>

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Excluir usuário?"
        description={
          <>
            O usuário <strong>{userToDelete?.email}</strong> perderá o acesso ao
            painel. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir usuário"
        loading={isDeletePending}
        onConfirm={handleDeleteUser}
      />
    </>
  );
}
