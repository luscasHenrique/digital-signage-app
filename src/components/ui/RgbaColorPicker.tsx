// src/components/ui/RgbaColorPicker.tsx
"use client";

import { RgbaStringColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { ControllerRenderProps } from "react-hook-form";
import { AdvertisementFormSchemaData } from "@/lib/schemas";
import { Input } from "./input";

// 1. Criamos um tipo que representa apenas os nomes dos campos de cor do nosso formulário.
type ColorFieldNames = "overlay_bg_color" | "overlay_text_color";

// 2. A interface agora usa este tipo específico em vez de 'any'.
interface RgbaColorPickerProps {
  field: ControllerRenderProps<AdvertisementFormSchemaData, ColorFieldNames>;
}

export function RgbaColorPicker({ field }: RgbaColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-14 p-0" // Tamanho fixo para o botão
        >
          {/* A div agora ocupa todo o espaço do botão e mostra a cor */}
          <div
            className="h-full w-full rounded-md border"
            style={{ backgroundColor: field.value }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-2">
        <RgbaStringColorPicker
          color={typeof field.value === "string" ? field.value : ""}
          onChange={field.onChange}
        />
        {/* Este input mostra o valor RGBA e permite edição manual */}
        <Input value={field.value} onChange={field.onChange} className="mt-2" />
      </PopoverContent>
    </Popover>
  );
}
