// src/lib/schemas.ts
import { z } from "zod";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
} from "@/types";

export const advertisementFormSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),

    // Mantemos opcional no form (validado adiante)
    type: z.nativeEnum(AdvertisementType).optional(),

    // Conteúdo principal
    content_file: z.any().optional(),
    content_url: z.string().optional(),

    // Thumbnail (OPCIONAL)
    thumbnail_file: z.any().optional(),
    thumbnail_url: z.string().optional(),

    start_date: z.date().nullable(),
    end_date: z.date().nullable(),

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
  })
  // Obrigatórios básicos
  .refine((data) => data.type !== undefined && data.type !== null, {
    message: "O tipo de anúncio é obrigatório.",
    path: ["type"],
  })
  .refine((data) => data.start_date !== null, {
    message: "A data inicial é obrigatória.",
    path: ["start_date"],
  })
  .refine((data) => data.end_date !== null, {
    message: "A data final é obrigatória.",
    path: ["end_date"],
  })
  // Data final >= inicial
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: "A data final deve ser igual ou posterior à data inicial.",
      path: ["end_date"],
    }
  )
  // Conteúdo coerente com o tipo (upload vs link)
  .refine(
    (data) => {
      if (!data.type) return true;

      const isUpload =
        data.type === AdvertisementType.IMAGE_UPLOAD ||
        data.type === AdvertisementType.VIDEO_UPLOAD;

      const isLink =
        data.type === AdvertisementType.IMAGE_LINK ||
        data.type === AdvertisementType.VIDEO_LINK ||
        data.type === AdvertisementType.EMBED_LINK;

      if (isLink) {
        return (
          !!data.content_url &&
          z.string().url().safeParse(data.content_url).success
        );
      }

      if (isUpload) {
        return (
          (typeof FileList !== "undefined" &&
            data.content_file instanceof FileList &&
            data.content_file.length > 0) ||
          !!data.content_url
        );
      }

      return false;
    },
    {
      message:
        "Um arquivo (para Upload) ou uma URL válida (para Link) é obrigatório.",
      path: ["content_url"],
    }
  )
  // Thumbnail OPCIONAL: se preencher, precisa ser válida
  .superRefine((data, ctx) => {
    // Se veio URL, precisa ser válida
    if (data.thumbnail_url) {
      const ok = z.string().url().safeParse(data.thumbnail_url).success;
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail_url"],
          message: "Informe uma URL válida para a thumbnail.",
        });
      }
    }
    // Se veio FileList, precisa ter ao menos um arquivo
    if (data.thumbnail_file !== undefined) {
      const isValid =
        typeof FileList !== "undefined" &&
        data.thumbnail_file instanceof FileList &&
        data.thumbnail_file.length > 0;

      if (!isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail_file"],
          message: "Arquivo de thumbnail inválido.",
        });
      }
    }
  });

// Tipo inferido para usar no form
export type AdvertisementFormSchemaData = z.infer<
  typeof advertisementFormSchema
>;
