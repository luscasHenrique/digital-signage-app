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

function extractStoragePathFromPublicUrl(url?: string | null): string | null {
  try {
    if (!url) return null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    const host = new URL(supabaseUrl).host;
    const u = new URL(url);
    if (u.host !== host) return null; // não é do seu Supabase

    const marker = "/storage/v1/object/public/advertisements/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;

    return decodeURIComponent(u.pathname.slice(idx + marker.length)); // path relativo ao bucket
  } catch {
    return null;
  }
}

// ESQUEMA DO SERVIDOR (ACTION SCHEMA)
// Server NUNCA recebe arquivo; apenas URLs (upload é feito no client)
const actionSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(3, "O título é obrigatório."),
    description: z.string().optional(),
    type: z.nativeEnum(AdvertisementType),

    // URL do conteúdo (obrigatório para qualquer tipo válido: upload ou link)
    content_url: z.string().optional(),

    // Thumbnail como URL (OPCIONAL)
    thumbnail_url: z.string().optional(),

    // Datas como ISO string
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
  // Conteúdo coerente com o tipo (upload vs link)
  .refine(
    (data) => {
      const isAllowedType = Object.values(AdvertisementType).includes(
        data.type
      );
      const hasValidUrl =
        !!data.content_url &&
        z.string().url().safeParse(data.content_url).success;
      return isAllowedType && hasValidUrl;
    },
    {
      message:
        "Um arquivo enviado (com URL pública) ou uma URL válida (para Link/Embed) é obrigatório.",
      path: ["content_url"],
    }
  )

  // Thumbnail OPCIONAL: valide apenas se enviada
  .superRefine((data, ctx) => {
    if (data.thumbnail_url) {
      const ok = z.string().url().safeParse(data.thumbnail_url).success;
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail_url"],
          message: "URL da thumbnail inválida.",
        });
      }
    }
  });

// ACTION PARA CRIAR ANÚNCIO
// Agora ela recebe um objeto JSON (sem FormData)
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

  const { company_ids, ...adData } = validation.data;

  try {
    // Passo 1: Inserir o anúncio e tentar selecionar o ID de volta
    const { data: newAdArray, error: adError } = await supabase
      .from("advertisements")
      .insert({ ...adData, created_by: user.id })
      .select("id"); // Removido .single() para mais resiliência

    if (adError) throw adError;

    const newAd = newAdArray?.[0];
    if (!newAd) {
      throw new Error(
        "Falha ao obter o ID do anúncio recém-criado. Verifique as políticas de RLS (SELECT) na tabela 'advertisements'."
      );
    }

    // Passo 2: Associar as empresas na tabela de junção
    const associations = company_ids.map((company_id) => ({
      advertisement_id: newAd.id,
      company_id,
    }));

    const { error: assocError } = await supabase
      .from("advertisements_companies")
      .insert(associations);

    if (assocError) throw assocError;

    revalidatePath("/dashboard/anuncios");
    return { success: true, message: "Anúncio criado com sucesso!" };
  } catch (error) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: { _server: ["Não autenticado"] } };
  }

  const { id, company_ids, ...adData } = validation.data;
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID do anúncio não fornecido."] },
    };
  }

  try {
    // 1) Carrega URLs antigas para comparar
    const { data: oldAd, error: fetchErr } = await supabase
      .from("advertisements")
      .select("content_url, thumbnail_url")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    // 2) Atualiza o registro
    const { error: adError } = await supabase
      .from("advertisements")
      .update({ ...adData, last_edited_by: user.id })
      .eq("id", id);
    if (adError) throw adError;

    // 3) Sincroniza empresas
    const { error: deleteLinkError } = await supabase
      .from("advertisements_companies")
      .delete()
      .eq("advertisement_id", id);
    if (deleteLinkError) throw deleteLinkError;

    const links = company_ids.map((company_id) => ({
      advertisement_id: id,
      company_id,
    }));
    const { error: insertLinkError } = await supabase
      .from("advertisements_companies")
      .insert(links);
    if (insertLinkError) throw insertLinkError;

    // 4) Best-effort: remove arquivos antigos se foram trocados e eram do seu Storage
    const pathsToRemove: string[] = [];
    if (oldAd?.content_url && oldAd.content_url !== adData.content_url) {
      const p = extractStoragePathFromPublicUrl(oldAd.content_url);
      if (p) pathsToRemove.push(p);
    }
    if (oldAd?.thumbnail_url && oldAd.thumbnail_url !== adData.thumbnail_url) {
      const p = extractStoragePathFromPublicUrl(oldAd.thumbnail_url);
      if (p) pathsToRemove.push(p);
    }
    if (pathsToRemove.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from("advertisements")
        .remove(pathsToRemove);
      if (storageErr)
        console.warn("Falha ao limpar arquivos antigos:", storageErr);
    }

    revalidatePath("/dashboard/anuncios");
    return { success: true, message: "Anúncio atualizado com sucesso!" };
  } catch (error) {
    console.error("ERRO DETALHADO AO ATUALIZAR ANÚNCIO:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      success: false,
      message: { _server: [`Falha ao atualizar anúncio: ${errorMessage}`] },
    };
  }
}

// ACTION PARA ELIMINAR ANÚNCIO
export async function deleteAdvertisement(adId: string) {
  const supabase = createActionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Não autenticado." };
  if (!adId) return { success: false, message: "ID do anúncio não fornecido." };

  try {
    // 1) Buscar URLs para limpeza do Storage
    const { data: ad, error: fetchErr } = await supabase
      .from("advertisements")
      .select("id, type, content_url, thumbnail_url")
      .eq("id", adId)
      .single();
    if (fetchErr) throw fetchErr;

    // 2) Apagar o registro no banco
    const { error: delDbErr } = await supabase
      .from("advertisements")
      .delete()
      .eq("id", adId);
    if (delDbErr) throw delDbErr;

    // 3) Best-effort: remover arquivos do bucket se forem do seu Supabase
    const pathsToRemove: string[] = [];
    const mainPath = extractStoragePathFromPublicUrl(
      ad?.content_url ?? undefined
    );
    const thumbPath = extractStoragePathFromPublicUrl(
      ad?.thumbnail_url ?? undefined
    );
    if (mainPath) pathsToRemove.push(mainPath);
    if (thumbPath) pathsToRemove.push(thumbPath);

    if (pathsToRemove.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from("advertisements") // ajuste se seu bucket tiver outro nome
        .remove(pathsToRemove);
      if (storageErr) {
        console.warn("Falha ao limpar arquivos do Storage:", storageErr);
      }
    }

    revalidatePath("/dashboard/anuncios");
    return { success: true, message: "Anúncio deletado com sucesso!" };
  } catch (error) {
    console.error("ERRO DETALHADO AO DELETAR ANÚNCIO:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro ao deletar anúncio.";
    return { success: false, message: errorMessage };
  }
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
