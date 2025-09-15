// src/components/admin/users/UsersColumns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
// Importa os tipos centralizados
import { UserRole, UserWithProfile } from "@/types";

export const columns = ({
  onEdit,
  onDelete,
}: {
  onEdit: (user: UserWithProfile) => void;
  onDelete: (user: UserWithProfile) => void;
}): ColumnDef<UserWithProfile>[] => [
  {
    accessorKey: "full_name",
    header: "Nome",
    // Adiciona um fallback caso o nome não esteja definido no perfil
    cell: ({ row }) => row.original.full_name || "Não definido",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Função",
    cell: ({ row }) => {
      const role = row.getValue("role") as UserRole | undefined;
      // Adiciona uma verificação para o caso de um usuário não ter um perfil/role
      if (!role) {
        return <Badge variant="outline">Sem Perfil</Badge>;
      }

      return (
        <Badge variant={role === UserRole.ADMIN ? "default" : "secondary"}>
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Criado em",
    cell: ({ row }) =>
      new Date(row.getValue("created_at")).toLocaleDateString("pt-BR"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 focus:bg-red-100 focus:text-red-700"
              onClick={() => onDelete(user)}
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
