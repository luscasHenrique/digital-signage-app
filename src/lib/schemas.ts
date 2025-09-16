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
    // ATUALIZADO: Tornamos o campo opcional para evitar o erro de sintaxe
    type: z.nativeEnum(AdvertisementType).optional(),
    content_file: z.any().optional(),
    content_url: z.string().optional(),
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
  // Garante que os campos obrigatórios sejam preenchidos
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
  // Garante que a data final é posterior à inicial
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
  // Lógica de validação do conteúdo
  .refine(
    (data) => {
      // Se nenhum tipo foi selecionado, não valida o conteúdo ainda
      if (!data.type) return true;

      const isUpload =
        data.type === AdvertisementType.IMAGE_UPLOAD ||
        data.type === AdvertisementType.VIDEO_UPLOAD;
      const isLink =
        data.type === AdvertisementType.IMAGE_LINK ||
        data.type === AdvertisementType.VIDEO_LINK ||
        data.type === AdvertisementType.EMBED_LINK;

      if (isLink)
        return (
          !!data.content_url &&
          z.string().url().safeParse(data.content_url).success
        );
      if (isUpload)
        return (
          (data.content_file instanceof FileList &&
            data.content_file.length > 0) ||
          !!data.content_url
        );

      return false;
    },
    {
      message:
        "Um arquivo (para Upload) ou uma URL válida (para Link) é obrigatório.",
      path: ["content_url"],
    }
  );

// Exporta o tipo inferido para que possamos usá-lo em toda a aplicação
export type AdvertisementFormSchemaData = z.infer<
  typeof advertisementFormSchema
>;
