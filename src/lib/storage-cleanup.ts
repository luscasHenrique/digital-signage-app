// src/lib/storage-cleanup.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  ADVERTISEMENTS_BUCKET,
  extractStoragePathFromPublicUrl,
} from "@/lib/storage";

/** Arquivos mais novos que isso podem ser de um formulário ainda aberto. */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

type StoredFile = { path: string; createdAt: string | null };

/** Lista os arquivos do bucket (pastas de 1 nível: `<user_id>/<arquivo>`). */
async function listBucketFiles(): Promise<StoredFile[]> {
  const bucket = supabaseAdmin.storage.from(ADVERTISEMENTS_BUCKET);
  const files: StoredFile[] = [];

  const listAll = async (prefix: string) => {
    const entries = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await bucket.list(prefix, {
        limit: PAGE_SIZE,
        offset,
      });
      if (error) throw error;
      entries.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) return entries;
    }
  };

  for (const entry of await listAll("")) {
    // Pastas vêm sem id
    if (entry.id === null) {
      for (const file of await listAll(entry.name)) {
        if (file.id !== null) {
          files.push({ path: `${entry.name}/${file.name}`, createdAt: file.created_at });
        }
      }
    } else {
      files.push({ path: entry.name, createdAt: entry.created_at });
    }
  }
  return files;
}

/** Caminhos do bucket referenciados por algum anúncio. */
async function usedPaths(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin
    .from("advertisements")
    .select("content_url, thumbnail_url");
  if (error) throw error;

  const used = new Set<string>();
  for (const ad of data ?? []) {
    for (const url of [ad.content_url, ad.thumbnail_url]) {
      const path = extractStoragePathFromPublicUrl(url as string | null);
      if (path) used.add(path);
    }
  }
  return used;
}

/**
 * Apaga mídias que nenhum anúncio usa (ex.: formulário abandonado sem salvar).
 * Só considera arquivos com mais de 24 h.
 */
export async function cleanupOrphanUploads(now = Date.now()) {
  // Lê os arquivos antes dos anúncios: um upload salvo no meio do processo
  // aparece como usado, nunca como órfão
  const files = await listBucketFiles();
  const used = await usedPaths();

  const orphans = files
    .filter((f) => !used.has(f.path))
    .filter((f) => f.createdAt && now - Date.parse(f.createdAt) > MIN_AGE_MS)
    .map((f) => f.path);

  for (let i = 0; i < orphans.length; i += PAGE_SIZE) {
    const { error } = await supabaseAdmin.storage
      .from(ADVERTISEMENTS_BUCKET)
      .remove(orphans.slice(i, i + PAGE_SIZE));
    if (error) throw error;
  }

  return { scanned: files.length, removed: orphans.length };
}
