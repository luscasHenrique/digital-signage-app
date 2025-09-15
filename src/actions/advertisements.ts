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

// ESQUEMA DO SERVIDOR (ACTION SCHEMA)
// Este esquema valida e converte (coage) os dados brutos do formulário
// para os tipos corretos que o banco de dados espera.
const actionSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),
    type: z.nativeEnum(AdvertisementType),

    // O conteúdo pode ser um ficheiro (para upload) ou uma URL (para link).
    content_file: z.instanceof(File).optional(),
    content_url: z.string().optional(),

    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    duration_seconds: z.coerce
      .number()
      .min(5, "A duração mínima é 5 segundos."),
    status: z
      .nativeEnum(AdvertisementStatus)
      .default(AdvertisementStatus.ACTIVE),
    company_ids: z.array(z.string()).min(1, "Selecione ao menos uma empresa."),
    overlay_text: z.string().optional(),
    overlay_position: z.nativeEnum(OverlayPosition).optional(),
    overlay_bg_color: z.string().optional(),
    overlay_text_color: z.string().optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "A data final deve ser igual ou posterior à data inicial.",
    path: ["end_date"],
  })
  // Validação customizada: garante que temos um ficheiro ou uma URL, dependendo do tipo.
  .refine(
    (data) => {
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
      // Para uploads, aceita um novo ficheiro ou uma URL já existente (no caso de edição sem alterar o ficheiro).
      if (isUpload) {
        return (
          (!!data.content_file && data.content_file.size > 0) ||
          !!data.content_url
        );
      }
      return false; // Se o tipo for inválido
    },
    {
      message:
        "Um ficheiro (para Upload) ou uma URL válida (para Link) é obrigatório.",
      path: ["content_url"],
    }
  );

// Função auxiliar para fazer o upload do ficheiro e obter a sua URL pública.
async function uploadFileAndGetUrl(
  supabase: ReturnType<typeof createServerClient>,
  file: File
) {
  const filePath = `public/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
  const { error } = await supabase.storage
    .from("advertisements")
    .upload(filePath, file);

  if (error) {
    console.error("Supabase Upload Error:", error);
    throw new Error("Falha no upload do ficheiro para o Supabase Storage.");
  }

  const { data: publicUrlData } = supabase.storage
    .from("advertisements")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

// ACTION PARA CRIAR ANÚNCIO
export async function createAdvertisement(formData: FormData) {
  const supabase = createServerClient();
  const rawData = Object.fromEntries(formData.entries());
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

  const { company_ids, content_file, ...adData } = validation.data;

  try {
    if (content_file && content_file.size > 0) {
      adData.content_url = await uploadFileAndGetUrl(supabase, content_file);
    }
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
    return {
      success: false,
      message: { _server: [`Erro no upload: ${errorMessage}`] },
    };
  }

  const { data: newAd, error: adError } = await supabase
    .from("advertisements")
    .insert(adData)
    .select("id")
    .single();
  if (adError)
    return { success: false, message: { _server: [adError.message] } };

  const links = company_ids.map((company_id) => ({
    advertisement_id: newAd.id,
    company_id,
  }));
  const { error: linkError } = await supabase
    .from("advertisements_companies")
    .insert(links);
  if (linkError)
    return { success: false, message: { _server: [linkError.message] } };

  revalidatePath("/dashboard/anuncios");
  return { success: true, message: "Anúncio criado com sucesso!" };
}

// ACTION PARA ATUALIZAR ANÚNCIO
export async function updateAdvertisement(formData: FormData) {
  const supabase = createServerClient();
  const rawData = Object.fromEntries(formData.entries());
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

  const { id, company_ids, content_file, ...adData } = validation.data;
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID do anúncio não fornecido."] },
    };
  }

  try {
    if (content_file && content_file.size > 0) {
      // Nota: A lógica para apagar o ficheiro antigo do storage não está aqui para simplificar.
      adData.content_url = await uploadFileAndGetUrl(supabase, content_file);
    }
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
    return {
      success: false,
      message: { _server: [`Erro no upload: ${errorMessage}`] },
    };
  }

  const { error: adError } = await supabase
    .from("advertisements")
    .update(adData)
    .eq("id", id);
  if (adError)
    return { success: false, message: { _server: [adError.message] } };

  // Sincroniza os vínculos
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
  if (linkError)
    return { success: false, message: { _server: [linkError.message] } };

  revalidatePath("/dashboard/anuncios");
  return { success: true, message: "Anúncio atualizado com sucesso!" };
}

// ACTION PARA ELIMINAR ANÚNCIO
export async function deleteAdvertisement(adId: string) {
  const supabase = createServerClient();
  if (!adId) {
    return { success: false, message: "ID do anúncio não fornecido." };
  }

  // Opcional: Deletar o ficheiro do storage antes de deletar o registo.
  // Para isso, precisaríamos primeiro de buscar a content_url do anúncio.

  // Graças ao 'ON DELETE CASCADE' na nossa tabela 'advertisements_companies',
  // ao deletar o anúncio, os vínculos são removidos automaticamente.
  const { error } = await supabase
    .from("advertisements")
    .delete()
    .eq("id", adId);

  if (error) {
    return { success: false, message: "Erro ao deletar anúncio." };
  }

  revalidatePath("/dashboard/anuncios");
  return { success: true, message: "Anúncio deletado com sucesso!" };
}
