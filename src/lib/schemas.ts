// src/lib/schemas.ts
import { z } from "zod";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
  UserRole,
} from "@/types";

/** Só aceita URLs http(s): bloqueia javascript:, data: etc. (viram XSS em href/src). */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export const advertisementFormSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(3, "O título é obrigatório."),
    description: z.string().optional(),

    // Opcional no form para começar sem tipo escolhido (validado adiante)
    type: z.nativeEnum(AdvertisementType).optional(),

    // URL do conteúdo: preenchida pelo upload (arquivo) ou digitada (link)
    content_url: z.string().optional(),
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
  .superRefine((data, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (!data.type) issue("type", "O tipo de anúncio é obrigatório.");
    if (!data.start_date) issue("start_date", "A data inicial é obrigatória.");
    if (!data.end_date) issue("end_date", "A data final é obrigatória.");
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      issue("end_date", "A data final deve ser igual ou posterior à inicial.");
    }

    if (data.type && !isHttpUrl(data.content_url)) {
      const isUpload =
        data.type === AdvertisementType.IMAGE_UPLOAD ||
        data.type === AdvertisementType.VIDEO_UPLOAD;
      issue(
        "content_url",
        isUpload
          ? "Envie o arquivo do anúncio."
          : "Informe uma URL válida (começando com https://)."
      );
    }

    if (data.thumbnail_url && !isHttpUrl(data.thumbnail_url)) {
      issue("thumbnail_url", "Informe uma URL válida para a capa.");
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
