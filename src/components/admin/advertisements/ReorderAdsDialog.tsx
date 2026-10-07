// src/components/admin/advertisements/ReorderAdsDialog.tsx
"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { reorderAdvertisements } from "@/actions/advertisements";
import { Button } from "@/components/ui/Button/Button";
import { Dialog } from "@/components/ui/Dialog/Dialog";
import { useToast } from "@/components/ui/Toast/Toast";
import type { AdvertisementWithCompanies } from "@/types";
import { AdvertisementPreview } from "./AdvertisementPreview";
import { ScheduleBadge } from "./ScheduleBadge";

interface ReorderAdsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Na ordem atual de exibição */
  ads: AdvertisementWithCompanies[];
}

export function ReorderAdsDialog({ open, onOpenChange, ads }: ReorderAdsDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Ordem de exibição"
      description="As telas mostram os anúncios nesta ordem, de cima para baixo. Anúncios novos entram no topo."
    >
      {/* Remonta a cada abertura para partir da ordem atual */}
      {open && <ReorderList ads={ads} onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ReorderList({
  ads,
  onDone,
}: {
  ads: AdvertisementWithCompanies[];
  onDone: () => void;
}) {
  const toast = useToast();
  const [order, setOrder] = useState(ads);
  const [saving, startSaving] = useTransition();
  const changed = order.some((ad, i) => ad.id !== ads[i]?.id);

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () =>
    startSaving(async () => {
      const result = await reorderAdvertisements(order.map((ad) => ad.id));
      if (result.success) {
        toast.success(result.message);
        onDone();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto pr-1">
        {order.map((ad, index) => (
          <li
            key={ad.id}
            className="flex items-center gap-3 rounded-[var(--lg-radius-md)] border border-border p-2"
          >
            <span className="w-6 text-center text-sm tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-[var(--lg-radius-sm)] bg-muted">
              <AdvertisementPreview ad={ad} sizes="64px" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{ad.title}</div>
              <ScheduleBadge ad={ad} />
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Subir ${ad.title}`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={16} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Descer ${ad.title}`}
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} />
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <Button size="lg" fullWidth loading={saving} disabled={!changed} onClick={save}>
        Salvar ordem
      </Button>
    </div>
  );
}
