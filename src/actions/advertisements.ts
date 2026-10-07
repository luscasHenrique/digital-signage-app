// src/actions/advertisements.ts
"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  isHttpUrl,
  normalizeWeeklySchedule,
  validateWeeklySchedule,
  weeklyScheduleFields,
} from "@/lib/schemas";
import {
  ADVERTISEMENTS_BUCKET,
  extractStoragePathFromPublicUrl,
  sanitizeFileName,
  validateUploadFile,
} from "@/lib/storage";
import { diffCompanyLinks } from "@/lib/advertisement-links";
import {
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
} from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/** Sincroniza os vínculos anúncio↔empresa adicionando antes de remover (nunca fica sem vínculo). */
async function syncCompanyLinks(
  supabase: SupabaseClient,
  advertisementId: string,
  companyIds: string[]
) {
  const { data: current, error: fetchErr } = await supabase
    .from("advertisements_companies")
    .select("company_id")
    .eq("advertisement_id", advertisementId);
  if (fetchErr) throw fetchErr;

  const { toAdd, toRemove } = diffCompanyLinks(
    (current ?? []).map((l) => l.company_id as string),
    companyIds
  );

  if (toAdd.length > 0) {
    const { error } = await supabase.from("advertisements_companies").insert(
      toAdd.map((company_id) => ({
        advertisement_id: advertisementId,
        company_id,
      }))
    );
    if (error) throw error;
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("advertisements_companies")
      .delete()
      .eq("advertisement_id", advertisementId)
      .in("company_id", toRemove);
    if (error) throw error;
  }
}

/**
 * Apaga do Storage os arquivos que nenhum anúncio usa mais.
 * Usa a service role: a política do bucket só deixa o dono do arquivo apagar,
 * e quem edita/exclui o anúncio pode não ser quem enviou a mídia.
 * Só chame depois de validar a sessão do usuário.
 */
async function removeStorageFiles(urls: (string | null | undefined)[]) {
  const candidates = Array.from(
    new Set(urls.filter((url): url is string => !!url))
  ).filter((url) => !!extractStoragePathFromPublicUrl(url));
  if (candidates.length === 0) return;

  try {
    const [asContent, asThumbnail] = await Promise.all([
      supabaseAdmin
        .from("advertisements")
        .select("content_url")
        .in("content_url", candidates),
      supabaseAdmin
        .from("advertisements")
        .select("thumbnail_url")
        .in("thumbnail_url", candidates),
    ]);
    if (asContent.error) throw asContent.error;
    if (asThumbnail.error) throw asThumbnail.error;

    const used = new Set<string>([
      ...(asContent.data ?? []).map((ad) => ad.content_url as string),
      ...(asThumbnail.data ?? []).map((ad) => ad.thumbnail_url as string),
    ]);
    const paths = candidates
      .filter((url) => !used.has(url))
      .map((url) => extractStoragePathFromPublicUrl(url) as string);
    if (paths.length === 0) return;

    const { error } = await supabaseAdmin.storage
      .from(ADVERTISEMENTS_BUCKET)
      .remove(paths);
    if (error) throw error;
  } catch (error) {
    console.warn("Falha ao limpar arquivos do Storage:", error);
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

    ...weeklyScheduleFields,
  })
  .superRefine((data, ctx) =>
    validateWeeklySchedule(data, (path, message) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
    )
  )
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
      const hasValidUrl = !!data.content_url && isHttpUrl(data.content_url);
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
      const ok = isHttpUrl(data.thumbnail_url);
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail_url"],
          message: "URL da thumbnail inválida.",
        });
      }
    }
  });

type ActionInput = z.infer<typeof actionSchema>;

// ACTION PARA CRIAR ANÚNCIO
export async function createAdvertisement(data: ActionInput) {
  const validation = actionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const ctx = await getAuthContext();
  if (!ctx)
    return { success: false, message: { _server: ["Não autenticado"] } };
  const { supabase, user } = ctx;

  const { company_ids, ...fields } = validation.data;
  const adData = { ...fields, ...normalizeWeeklySchedule(fields) };

  try {
    const { data: newAdArray, error: adError } = await supabase
      .from("advertisements")
      .insert({ ...adData, created_by: user.id })
      .select("id");
    if (adError) throw adError;

    const newAd = newAdArray?.[0];
    if (!newAd) {
      throw new Error(
        "Falha ao obter o ID do anúncio recém-criado. Verifique as políticas de RLS (SELECT) na tabela 'advertisements'."
      );
    }

    try {
      await syncCompanyLinks(supabase, newAd.id, company_ids);
    } catch (linkError) {
      // Desfaz a criação para não deixar anúncio órfão (sem empresas).
      await supabase.from("advertisements").delete().eq("id", newAd.id);
      throw linkError;
    }

    // Lista geral, anúncios por empresa e contadores do dashboard
    revalidatePath("/dashboard", "layout");
    return { success: true, message: "Anúncio criado com sucesso!" };
  } catch (error) {
    console.error("ERRO DETALHADO AO CRIAR ANÚNCIO:", error);
    return {
      success: false,
      message: { _server: [`Falha ao criar anúncio: ${errorMessage(error)}`] },
    };
  }
}

// ACTION PARA ATUALIZAR ANÚNCIO
export async function updateAdvertisement(data: ActionInput) {
  const validation = actionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const ctx = await getAuthContext();
  if (!ctx)
    return { success: false, message: { _server: ["Não autenticado"] } };
  const { supabase, user } = ctx;

  const { id, company_ids, ...fields } = validation.data;
  const adData = { ...fields, ...normalizeWeeklySchedule(fields) };
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID do anúncio não fornecido."] },
    };
  }

  try {
    // URLs antigas, para limpar arquivos substituídos
    const { data: oldAd, error: fetchErr } = await supabase
      .from("advertisements")
      .select("content_url, thumbnail_url")
      .eq("id", id)
      .single();
    if (fetchErr) throw fetchErr;

    const { error: adError } = await supabase
      .from("advertisements")
      .update({ ...adData, last_edited_by: user.id })
      .eq("id", id);
    if (adError) throw adError;

    await syncCompanyLinks(supabase, id, company_ids);

    // Best-effort: remove arquivos antigos que foram trocados
    await removeStorageFiles([
      oldAd?.content_url !== adData.content_url ? oldAd?.content_url : null,
      oldAd?.thumbnail_url !== adData.thumbnail_url
        ? oldAd?.thumbnail_url
        : null,
    ]);

    // Lista geral, anúncios por empresa e contadores do dashboard
    revalidatePath("/dashboard", "layout");
    return { success: true, message: "Anúncio atualizado com sucesso!" };
  } catch (error) {
    console.error("ERRO DETALHADO AO ATUALIZAR ANÚNCIO:", error);
    return {
      success: false,
      message: {
        _server: [`Falha ao atualizar anúncio: ${errorMessage(error)}`],
      },
    };
  }
}

// ACTION PARA ELIMINAR ANÚNCIO
export async function deleteAdvertisement(adId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Não autenticado." };
  if (!adId) return { success: false, message: "ID do anúncio não fornecido." };
  const { supabase } = ctx;

  try {
    const { data: ad, error: fetchErr } = await supabase
      .from("advertisements")
      .select("id, content_url, thumbnail_url")
      .eq("id", adId)
      .single();
    if (fetchErr) throw fetchErr;

    const { error: delDbErr } = await supabase
      .from("advertisements")
      .delete()
      .eq("id", adId);
    if (delDbErr) throw delDbErr;

    // Best-effort: remover arquivos do bucket
    await removeStorageFiles([ad?.content_url, ad?.thumbnail_url]);

    // Lista geral, anúncios por empresa e contadores do dashboard
    revalidatePath("/dashboard", "layout");
    return { success: true, message: "Anúncio deletado com sucesso!" };
  } catch (error) {
    console.error("ERRO DETALHADO AO DELETAR ANÚNCIO:", error);
    return {
      success: false,
      message: errorMessage(error, "Erro ao deletar anúncio."),
    };
  }
}

// Gera URL assinada para o navegador enviar o arquivo direto ao Storage
export async function getSignedUploadUrl({
  fileName,
  fileType,
  fileSize,
}: {
  fileName: string;
  fileType: string;
  fileSize: number;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Não autenticado." };

  const invalid = validateUploadFile({ type: fileType, size: fileSize });
  if (invalid) return { success: false, message: invalid };

  const path = `${ctx.user.id}/${Date.now()}-${sanitizeFileName(fileName)}`;

  try {
    const bucket = ctx.supabase.storage.from(ADVERTISEMENTS_BUCKET);
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error) throw error;

    const {
      data: { publicUrl },
    } = bucket.getPublicUrl(path);

    return {
      success: true,
      message: "URL gerada com sucesso.",
      data: { url: data.signedUrl, path, publicUrl },
    };
  } catch (error) {
    console.error("Erro ao gerar URL de upload:", errorMessage(error));
    return { success: false, message: "Falha ao gerar URL de upload." };
  }
}

/**
 * Remove arquivos enviados num formulário que foi cancelado antes de salvar.
 * Só apaga arquivos da pasta do próprio usuário e que nenhum anúncio esteja usando.
 */
export async function discardUploads(urls: string[]) {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Não autenticado." };

  const candidates = Array.from(new Set(urls)).slice(0, 10);
  const paths = candidates
    .map((url) => ({ url, path: extractStoragePathFromPublicUrl(url) }))
    .filter(
      (item): item is { url: string; path: string } =>
        !!item.path && item.path.startsWith(`${ctx.user.id}/`)
    );
  if (paths.length === 0) return { success: true, message: "Nada a remover." };

  await removeStorageFiles(paths.map((p) => p.url));
  return { success: true, message: "Arquivos removidos." };
}

function errorMessage(error: unknown, fallback = "Erro desconhecido."): string {
  return error instanceof Error ? error.message : fallback;
}

/** Grava a ordem de exibição (o primeiro id passa primeiro na tela). */
export async function reorderAdvertisements(ids: string[]) {
  const parsed = z.array(z.string().uuid()).min(1).max(1000).safeParse(ids);
  if (!parsed.success) return { success: false, message: "Lista inválida." };

  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Não autenticado." };

  const { error } = await ctx.supabase.rpc("reorder_advertisements", {
    p_ids: parsed.data,
  });
  if (error) {
    console.error("Erro ao reordenar anúncios:", error);
    return { success: false, message: "Não foi possível salvar a ordem." };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true, message: "Ordem salva." };
}

const idsSchema = z.array(z.string().uuid()).min(1).max(500);

/** Ativa ou desativa vários anúncios de uma vez. */
export async function setAdvertisementsStatus(
  ids: string[],
  status: AdvertisementStatus
) {
  const parsed = idsSchema.safeParse(ids);
  const parsedStatus = z.nativeEnum(AdvertisementStatus).safeParse(status);
  if (!parsed.success || !parsedStatus.success) {
    return { success: false, message: "Seleção inválida." };
  }

  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Não autenticado." };

  const { error } = await ctx.supabase
    .from("advertisements")
    .update({ status: parsedStatus.data, last_edited_by: ctx.user.id })
    .in("id", parsed.data);
  if (error) {
    console.error("Erro ao alterar status em lote:", error);
    return { success: false, message: "Não foi possível alterar os anúncios." };
  }

  revalidatePath("/dashboard", "layout");
  const verb = parsedStatus.data === AdvertisementStatus.ACTIVE ? "ativado(s)" : "desativado(s)";
  return { success: true, message: `${parsed.data.length} anúncio(s) ${verb}.` };
}

/** Exclui vários anúncios e apaga as mídias que ficarem sem uso. */
export async function deleteAdvertisements(ids: string[]) {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { success: false, message: "Seleção inválida." };

  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Não autenticado." };

  try {
    const { data: ads, error: fetchErr } = await ctx.supabase
      .from("advertisements")
      .select("content_url, thumbnail_url")
      .in("id", parsed.data);
    if (fetchErr) throw fetchErr;

    const { error } = await ctx.supabase
      .from("advertisements")
      .delete()
      .in("id", parsed.data);
    if (error) throw error;

    await removeStorageFiles(
      (ads ?? []).flatMap((ad) => [ad.content_url, ad.thumbnail_url])
    );

    revalidatePath("/dashboard", "layout");
    return {
      success: true,
      message: `${parsed.data.length} anúncio(s) excluído(s).`,
    };
  } catch (error) {
    console.error("Erro ao excluir anúncios em lote:", error);
    return { success: false, message: "Não foi possível excluir os anúncios." };
  }
}
