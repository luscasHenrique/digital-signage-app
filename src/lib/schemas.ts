// src/lib/schemas.ts
import { z } from "zod";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
  UserRole,
} from "@/types";
import { validateUploadFile } from "@/lib/storage";

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
        // A validação de arquivo obrigatório é feita aqui
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
      path: ["content_url"], // O erro aponta para o campo de URL, mas a mensagem é genérica
    }
  )
  // ✅ Thumbnail e TIPO DE ARQUIVO (validações atualizadas aqui)
  .superRefine((data, ctx) => {
    // 1. Valida URL da thumbnail (se existir)
    if (data.thumbnail_url) {
      if (!z.string().url().safeParse(data.thumbnail_url).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail_url"],
          message: "Informe uma URL válida para a thumbnail.",
        });
      }
    }

    // 2. Valida arquivo de thumbnail (se existir, verifica se é imagem)
    if (
      data.thumbnail_file &&
      data.thumbnail_file instanceof FileList &&
      data.thumbnail_file.length > 0
    ) {
      const file = data.thumbnail_file[0];
      const uploadError = file.type.startsWith("image/")
        ? validateUploadFile(file)
        : "O arquivo da thumbnail deve ser uma imagem.";
      if (uploadError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail_file"],
          message: uploadError,
        });
      }
    }

    // 3. Valida arquivo de conteúdo principal (tipo e tamanho)
    if (
      (data.type === AdvertisementType.IMAGE_UPLOAD ||
        data.type === AdvertisementType.VIDEO_UPLOAD) &&
      data.content_file &&
      data.content_file instanceof FileList &&
      data.content_file.length > 0
    ) {
      const file = data.content_file[0];
      const expectedPrefix =
        data.type === AdvertisementType.IMAGE_UPLOAD ? "image/" : "video/";
      const uploadError = file.type.startsWith(expectedPrefix)
        ? validateUploadFile(file)
        : data.type === AdvertisementType.IMAGE_UPLOAD
          ? "O arquivo de conteúdo deve ser uma imagem."
          : "O arquivo de conteúdo deve ser um vídeo.";
      if (uploadError) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content_file"],
          message: uploadError,
        });
      }
    }
  });

// Tipo inferido para usar no form
export type AdvertisementFormSchemaData = z.infer<
  typeof advertisementFormSchema
>;

/* =========================
   EMPRESAS
   ========================= */

export const companySchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
    slug: z
      .string()
      .min(3, "O slug deve ter pelo menos 3 caracteres.")
      .regex(
        /^[a-z0-9-]+$/,
        "O slug deve conter apenas letras minúsculas, números e hifens."
      ),
    is_private: z.boolean(),
    // Em edição, vazio significa "manter a senha atual".
    password: z
      .string()
      .min(4, "A senha deve ter no mínimo 4 caracteres.")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => !(data.is_private && !data.id && !data.password), {
    message: "Defina uma senha para a página privada.",
    path: ["password"],
  });

export type CompanyFormData = z.infer<typeof companySchema>;

/* =========================
   USUÁRIOS
   ========================= */

export const userFormSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().trim().min(3, "O nome completo é obrigatório."),
  email: z.string().email("O e-mail fornecido é inválido."),
  // Em edição, vazio significa "manter a senha atual".
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .optional()
    .or(z.literal("")),
  role: z.nativeEnum(UserRole),
});

export type UserFormData = z.infer<typeof userFormSchema>;
