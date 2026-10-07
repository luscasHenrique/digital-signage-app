// src/components/admin/PaginationNav.tsx
"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";

/** Anterior / "Página X de Y" / Próxima, para listas paginadas no servidor. */
export function PaginationNav({
  page,
  totalPages,
  onPageChange,
  start,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Conteúdo à esquerda (ex.: itens por página, contagem) */
  start?: ReactNode;
}) {
  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div className="text-sm text-muted-foreground">{start}</div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ChevronLeft />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="px-1 text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<ChevronRight />}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
