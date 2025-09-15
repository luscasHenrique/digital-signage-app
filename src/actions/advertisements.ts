// src/actions/advertisements.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
} from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const actionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().optional(),
  type: z.nativeEnum(AdvertisementType),
  content_url: z.string().url("Por favor, insira uma URL válida."),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  duration_seconds: z.coerce.number().min(5, "A duração mínima é 5 segundos."),
  status: z.nativeEnum(AdvertisementStatus).default(AdvertisementStatus.ACTIVE),
  company_ids: z.array(z.string()).min(1, "Selecione ao menos uma empresa."),
  overlay_text: z.string().optional(),
  overlay_position: z.nativeEnum(OverlayPosition).optional(),
  overlay_bg_color: z.string().optional(),
  overlay_text_color: z.string().optional(),
});

export async function createAdvertisement(formData: FormData) {
  const supabase = createServerClient();

  const rawData = Object.fromEntries(formData.entries());

  // CORREÇÃO APLICADA AQUI:
  // Criamos um novo objeto para validação, convertendo 'company_ids' para um array.
  // Isso evita o erro de tipo ao tentar modificar o 'rawData' original.
  const dataToValidate = {
    ...rawData,
    company_ids:
      typeof rawData.company_ids === "string"
        ? rawData.company_ids.split(",")
        : [],
  };

  const validation = actionSchema.safeParse(dataToValidate);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const { company_ids, ...adData } = validation.data;

  const { data: newAd, error: adError } = await supabase
    .from("advertisements")
    .insert(adData)
    .select("id")
    .single();

  if (adError) {
    return { success: false, message: { _server: [adError.message] } };
  }

  const links = company_ids.map((company_id) => ({
    advertisement_id: newAd.id,
    company_id,
  }));
  const { error: linkError } = await supabase
    .from("advertisements_companies")
    .insert(links);

  if (linkError) {
    return { success: false, message: { _server: [linkError.message] } };
  }

  revalidatePath("/dashboard/anuncios");
  return { success: true, message: "Anúncio criado com sucesso!" };
}

export async function updateAdvertisement(formData: FormData) {
  const supabase = createServerClient();

  const rawData = Object.fromEntries(formData.entries());

  // CORREÇÃO APLICADA AQUI TAMBÉM:
  const dataToValidate = {
    ...rawData,
    company_ids:
      typeof rawData.company_ids === "string"
        ? rawData.company_ids.split(",")
        : [],
  };

  const validation = actionSchema.safeParse(dataToValidate);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const { id, company_ids, ...adData } = validation.data;
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID do anúncio não fornecido."] },
    };
  }

  const { error: adError } = await supabase
    .from("advertisements")
    .update(adData)
    .eq("id", id);

  if (adError) {
    return { success: false, message: { _server: [adError.message] } };
  }

  await supabase
    .from("advertisements_companies")
    .delete()
    .eq("advertisement_id", id);
  const links = company_ids.map((company_id) => ({
    advertisement_id: id,
    company_id,
  }));
  const { error: linkError } = await supabase
    .from("advertisements_companies")
    .insert(links);
  if (linkError) {
    return { success: false, message: { _server: [linkError.message] } };
  }

  revalidatePath("/dashboard/anuncios");
  return { success: true, message: "Anúncio atualizado com sucesso!" };
}
