// src/components/admin/advertisements/ContentFields.tsx
"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AdvertisementType } from "@/types";
import { UseFormReturn } from "react-hook-form";

// ATUALIZADO: Importamos o tipo centralizado do nosso novo arquivo de schemas
import { AdvertisementFormSchemaData } from "@/lib/schemas";

// A interface agora usa o tipo importado, que é a fonte única da verdade
interface ContentFieldsProps {
  form: UseFormReturn<AdvertisementFormSchemaData>;
  adType: AdvertisementType | undefined;
}

export function ContentFields({ form, adType }: ContentFieldsProps) {
  const isLinkType = adType?.includes("LINK");
  const isUploadType = adType?.includes("UPLOAD");

  if (isLinkType) {
    return (
      <FormField
        control={form.control}
        name="content_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL do Conteúdo</FormLabel>
            <FormControl>
              <Input placeholder="https://exemplo.com/imagem.jpg" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (isUploadType) {
    return (
      <FormField
        control={form.control}
        name="content_file"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Arquivo do Anúncio</FormLabel>
            <FormControl>
              <Input
                type="file"
                accept={
                  adType === AdvertisementType.IMAGE_UPLOAD
                    ? "image/*"
                    : `video/mp4,video/webm`
                }
                // Ajuste para garantir que o 'value' seja limpo ao selecionar um arquivo
                onChange={(e) => field.onChange(e.target.files)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return null; // Não mostra nada se nenhum tipo for selecionado
}
