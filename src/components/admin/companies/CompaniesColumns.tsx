// src/components/admin/companies/CompaniesColumns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Company } from "@/types";
import { Badge } from "@/components/ui/badge";

export const columns = ({
  onEdit,
  onDelete, // 1. Adicionar onDelete às props
}: {
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void; // 2. Definir o tipo da função
}): ColumnDef<Company>[] => [
  {
    accessorKey: "name",
    header: "Nome da Empresa",
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <code className="font-mono text-sm">/{row.original.slug}</code>
    ),
  },
  {
    accessorKey: "is_private",
    header: "Visibilidade",
    cell: ({ row }) => {
      const isPrivate = row.getValue("is_private");
      return isPrivate ? (
        <Badge variant="secondary">
          <ShieldCheck className="mr-1 h-3 w-3" /> Privada
        </Badge>
      ) : (
        <Badge variant="outline">
          <ShieldOff className="mr-1 h-3 w-3" /> Pública
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Criada em",
    cell: ({ row }) =>
      new Date(row.getValue("created_at")).toLocaleDateString("pt-BR"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const company = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(company)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* 3. Chamar a função onDelete ao clicar */}
            <DropdownMenuItem
              className="text-red-500 focus:bg-red-100 focus:text-red-700"
              onClick={() => onDelete(company)}
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
