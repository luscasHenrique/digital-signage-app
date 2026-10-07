// src/lib/schemas.ts
import { z } from "zod";
import {
  AdvertisementStatus,
  AdvertisementType,
  DISPLAY_TRANSITIONS,
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

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Campos da programação semanal (mesmos no formulário e na action). */
export const weeklyScheduleFields = {
  /** Dias marcados (0 = domingo). Vazio ou todos = sem restrição. */
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  /** "HH:MM"; vazio = o dia todo */
  daily_start: z.string().nullable().optional(),
  daily_end: z.string().nullable().optional(),
};

type WeeklyScheduleInput = {
  weekdays?: number[] | null;
  daily_start?: string | null;
  daily_end?: string | null;
};

export function validateWeeklySchedule(
  data: WeeklyScheduleInput,
  issue: (path: string, message: string) => void
) {
  if (data.weekdays && data.weekdays.length === 0) {
    issue("weekdays", "Escolha ao menos um dia.");
  }
  const start = data.daily_start || "";
  const end = data.daily_end || "";
  if (start && !HHMM.test(start)) issue("daily_start", "Horário inválido.");
  if (end && !HHMM.test(end)) issue("daily_end", "Horário inválido.");
  if (!!start !== !!end) {
    issue(start ? "daily_end" : "daily_start", "Informe o início e o fim.");
  } else if (start && start === end) {
    issue("daily_end", "O fim deve ser diferente do início.");
  }
}

/** Formato gravado no banco: sem restrição vira null. */
export function normalizeWeeklySchedule(data: WeeklyScheduleInput) {
  const weekdays =
    data.weekdays && data.weekdays.length > 0 && data.weekdays.length < 7
      ? Array.from(new Set(data.weekdays)).sort()
      : null;
  return {
    weekdays,
    daily_start: data.daily_start || null,
    daily_end: data.daily_end || null,
  };
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

    ...weeklyScheduleFields,
  })
  .superRefine((data, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    validateWeeklySchedule(data, issue);

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
    transition: z.enum(DISPLAY_TRANSITIONS),
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
