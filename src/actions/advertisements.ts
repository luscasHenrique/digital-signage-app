// src/actions/advertisements.ts
"use server";

import { createActionClient } from "@/lib/supabase/server";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
} from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ESQUEMA DO SERVIDOR (ACTION SCHEMA)
const actionSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),
    type: z.nativeEnum(AdvertisementType),
    content_file: z.instanceof(File).optional(),
    content_url: z.string().optional(),
    // As datas agora são validadas como strings, que é o formato que enviaremos (ISOString)
    start_date: z.string(),
    end_date: z.string(),
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
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
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

// ACTION PARA CRIAR ANÚNCIO
// Agora ela recebe um objeto JSON, não mais um FormData
export async function createAdvertisement(data: z.infer<typeof actionSchema>) {
  const supabase = createActionClient();
  const validation = actionSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { success: false, message: { _server: ["Não autenticado"] } };

  const { company_ids, content_file, ...adData } = validation.data;

  try {
    // Passo 1: Inserir o anúncio e tentar selecionar o ID de volta
    const { data: newAdArray, error: adError } = await supabase
      .from("advertisements")
      .insert({ ...adData, created_by: user.id })
      .select("id"); // Removido .single() para mais resiliência

    // Se houver um erro direto do banco, ele será capturado pelo 'catch'
    if (adError) throw adError;

    // Verifica se o insert retornou o ID. Se não, é provável ser um problema de RLS.
    const newAd = newAdArray?.[0];
    if (!newAd) {
      throw new Error(
        "Falha ao obter o ID do anúncio recém-criado. Verifique as políticas de RLS (SELECT) na tabela 'advertisements'."
      );
    }

    // Passo 2: Associar as empresas na tabela de junção
    const associations = company_ids.map((company_id) => ({
      advertisement_id: newAd.id,
      company_id: company_id,
    }));

    const { error: assocError } = await supabase
      .from("advertisements_companies")
      .insert(associations);

    // Se houver um erro na associação, ele será capturado pelo 'catch'
    if (assocError) throw assocError;

    revalidatePath("/dashboard/anuncios");
    return { success: true, message: "Anúncio criado com sucesso!" };
  } catch (error) {
    // Log detalhado no CONSOLE DO SERVIDOR (terminal) para depuração
    console.error("ERRO DETALHADO AO CRIAR ANÚNCIO:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      success: false,
      message: { _server: [`Falha ao criar anúncio: ${errorMessage}`] },
    };
  }
}
// ACTION PARA ATUALIZAR ANÚNCIO
export async function updateAdvertisement(data: z.infer<typeof actionSchema>) {
  const supabase = createActionClient();
  const validation = actionSchema.safeParse(data);

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

  // A lógica de upload de arquivo já acontece no formulário antes de chamar esta action.
  // A 'adData' já contém a 'content_url' correta, seja a antiga ou a nova.

  const { error: adError } = await supabase
    .from("advertisements")
    .update(adData)
    .eq("id", id);

  if (adError) {
    return { success: false, message: { _server: [adError.message] } };
  }

  // Sincroniza os vínculos com as empresas (deleta os antigos e insere os novos)
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

// ACTION PARA ELIMINAR ANÚNCIO
export async function deleteAdvertisement(adId: string) {
  const supabase = createActionClient(); // ATUALIZADO
  if (!adId) {
    return { success: false, message: "ID do anúncio não fornecido." };
  }

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

// NOVA ACTION: Para gerar a URL de Upload Segura
export async function getSignedUploadUrl({
  fileName,
  fileType,
}: {
  fileName: string;
  fileType: string;
}) {
  const supabase = createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Não autenticado." };
  }

  // Cria um nome de arquivo único para evitar conflitos de nomes iguais
  const path = `${user.id}/${Date.now()}-${fileName.replace(/\s/g, "_")}`;

  try {
    const { data, error } = await supabase.storage
      .from("advertisements") // VERIFIQUE: Este é o nome do seu bucket no Supabase?
      .createSignedUploadUrl(path);

    if (error) throw error;

    // Retorna a URL assinada (para onde o arquivo será enviado) e o 'path' (para construir a URL pública depois)
    return {
      success: true,
      message: "URL gerada com sucesso.",
      data: { url: data.signedUrl, path },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("Erro ao gerar URL de upload:", errorMessage);
    return { success: false, message: "Falha ao gerar URL de upload." };
  }
}
