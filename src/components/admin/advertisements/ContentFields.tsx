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
import {
  AdvertisementType,
  AdvertisementStatus,
  OverlayPosition,
} from "@/types"; // Importa os Enums
import { UseFormReturn } from "react-hook-form";
import { z } from "zod"; // Importa o Zod

// Definimos o schema aqui para que o componente conheça a estrutura do formulário
// ATENÇÃO: Este schema deve ser IDÊNTICO ao que está no AdvertisementForm.tsx
const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().optional(),
  type: z.nativeEnum(AdvertisementType),
  content_file: z.any().optional(),
  content_url: z.string().optional(),
  start_date: z.date(),
  end_date: z.date(),
  duration_seconds: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 5,
      "A duração mínima é 5 segundos."
    ),
  status: z.nativeEnum(AdvertisementStatus),
  company_ids: z.array(z.string()).min(1, "Selecione ao menos uma empresa."),
  overlay_text: z.string().optional(),
  overlay_position: z.nativeEnum(OverlayPosition).optional(),
  overlay_bg_color: z.string().optional(),
  overlay_text_color: z.string().optional(),
});

type FormSchemaData = z.infer<typeof formSchema>;

// A interface agora usa o tipo específico do formulário
interface ContentFieldsProps {
  form: UseFormReturn<FormSchemaData>;
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
                    : `video/mp4,video/webm` // <-- ERRO DE DIGITAÇÃO CORRIGIDO
                }
                onChange={(e) => field.onChange(e.target.files)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return null;
}
