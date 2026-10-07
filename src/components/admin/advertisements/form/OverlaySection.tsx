// src/components/admin/advertisements/form/OverlaySection.tsx
"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Clapperboard } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl/SegmentedControl";
import { Textarea } from "@/components/ui/Textarea/Textarea";
import type { AdvertisementFormSchemaData } from "@/lib/schemas";
import { OverlayPosition } from "@/types";
import { ColorField } from "../ColorField";
import { FormSection as Section } from "./FormSection";

/** Texto opcional exibido por cima do anúncio, com prévia. */
export function OverlaySection() {
  const { control, watch } = useFormContext<AdvertisementFormSchemaData>();
  const overlayText = watch("overlay_text");
  const overlay = watch([
    "overlay_position",
    "overlay_bg_color",
    "overlay_text_color",
  ]);

  return (
    <Section title="Texto sobre o anúncio (opcional)">
      <Controller
        control={control}
        name="overlay_text"
        render={({ field }) => (
          <Textarea
            {...field}
            value={field.value ?? ""}
            aria-label="Texto do overlay"
            placeholder="Mensagem exibida por cima do anúncio..."
            maxLength={200}
            showCount
          />
        )}
      />

      {overlayText && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Controller
              control={control}
              name="overlay_position"
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Posição</span>
                  <SegmentedControl
                    fullWidth
                    ariaLabel="Posição do texto"
                    value={field.value}
                    onValueChange={field.onChange}
                    items={[
                      { value: OverlayPosition.TOP, label: "Topo" },
                      { value: OverlayPosition.BOTTOM, label: "Rodapé" },
                    ]}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="overlay_bg_color"
              render={({ field }) => (
                <ColorField
                  label="Cor do fundo"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={control}
              name="overlay_text_color"
              render={({ field }) => (
                <ColorField
                  label="Cor do texto"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Prévia de como o texto aparece na tela */}
          <div
            className="relative flex aspect-[16/5] overflow-hidden rounded-[var(--lg-radius-lg)] bg-gradient-to-br from-slate-700 to-slate-900"
            style={{
              alignItems:
                overlay[0] === OverlayPosition.TOP
                  ? "flex-start"
                  : "flex-end",
            }}
            aria-hidden="true"
          >
            <Clapperboard className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-white/30" />
            <div
              className="w-full px-3 py-2 text-center text-sm font-bold"
              style={{ background: overlay[1], color: overlay[2] }}
            >
              {overlayText}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
