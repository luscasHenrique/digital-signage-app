// src/components/admin/advertisements/AdvertisementsColumns.tsx
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
import { AdvertisementStatus } from "@/types";
import { AdvertisementWithCompanies } from "./AdvertisementsClient";

// 1. ATUALIZAR A ASSINATURA DA FUNÇÃO
// Agora ela espera receber tanto 'onEdit' como 'onDelete'.
export const columns = ({
  onEdit,
  onDelete,
}: {
  onEdit: (ad: AdvertisementWithCompanies) => void;
  onDelete: (ad: AdvertisementWithCompanies) => void;
}): ColumnDef<AdvertisementWithCompanies>[] => [
  {
    accessorKey: "title",
    header: "Título",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as AdvertisementStatus;
      return (
        <Badge
          variant={
            status === AdvertisementStatus.ACTIVE ? "default" : "destructive"
          }
        >
          {status === AdvertisementStatus.ACTIVE ? "Ativo" : "Inativo"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "companies",
    header: "Empresas",
    cell: ({ row }) => {
      const companies = row.original.companies;
      if (!companies || companies.length === 0) return <span>N/A</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {companies.map((c) => (
            <Badge key={c.id} variant="secondary">
              {c.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "end_date",
    header: "Válido até",
    cell: ({ row }) =>
      new Date(row.getValue("end_date")).toLocaleDateString("pt-BR"),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const ad = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(ad)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* 2. O onClick agora chama a função onDelete que recebemos */}
            <DropdownMenuItem
              className="text-red-500 focus:bg-red-100 focus:text-red-700"
              onClick={() => onDelete(ad)}
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
