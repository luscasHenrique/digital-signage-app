// src/components/admin/RowActions.tsx
"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import {
  DropdownMenu,
  type MenuEntry,
} from "@/components/ui/DropdownMenu/DropdownMenu";

/** Botão "…" com o menu de ações de uma linha de tabela ou card. */
export function RowActions({
  items,
  label = "Abrir ações",
}: {
  items: MenuEntry[];
  label?: string;
}) {
  return (
    <DropdownMenu
      placement="bottom-end"
      width={220}
      items={items}
      trigger={({ onClick, ...props }) => (
        <Button
          {...props}
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={label}
          onClick={(e) => {
            // Não dispara o clique da linha/card que contém o menu
            e.stopPropagation();
            onClick();
          }}
        >
          <MoreHorizontal />
        </Button>
      )}
    />
  );
}
