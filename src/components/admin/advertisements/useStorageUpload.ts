// src/components/admin/advertisements/useStorageUpload.ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import { discardUploads, getSignedUploadUrl } from "@/actions/advertisements";
import type { UploadHandler } from "@/components/ui/FileUpload/FileUpload";
import { optimizeImageForUpload } from "@/lib/image-optimize";
import { validateUploadFile } from "@/lib/storage";

/** PUT do arquivo na URL assinada com progresso real e cancelamento. */
function putFile(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Falha no envio do arquivo."));
    xhr.onerror = () => reject(new Error("Falha de rede no envio."));
    xhr.onabort = () => reject(new Error("Envio cancelado."));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

/**
 * Envia arquivos direto para o Storage (via URL assinada) assim que são escolhidos.
 * Os arquivos enviados e não usados no anúncio salvo são apagados ao fechar o formulário.
 */
export function useStorageUpload() {
  const uploadedUrls = useRef<string[]>([]);
  const keptUrls = useRef<string[]>([]);

  const createUploadHandler = useCallback(
    (onUploaded: (publicUrl: string) => void): UploadHandler =>
      async (original, { onProgress, signal }) => {
        // Imagens grandes viram WebP em até 4K antes de subir
        const file = await optimizeImageForUpload(original);
        const invalid = validateUploadFile(file);
        if (invalid) throw new Error(invalid);

        const signed = await getSignedUploadUrl({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });
        if (!signed.success || !signed.data) {
          throw new Error(signed.message);
        }

        await putFile(signed.data.url, file, onProgress, signal);
        uploadedUrls.current.push(signed.data.publicUrl);
        onUploaded(signed.data.publicUrl);
      },
    []
  );

  /** Marca as URLs usadas pelo anúncio salvo (não serão apagadas). */
  const keep = useCallback((urls: (string | undefined)[]) => {
    keptUrls.current = urls.filter((u): u is string => !!u);
  }, []);

  // Ao desmontar (fechar o formulário), descarta os envios que não foram usados
  useEffect(
    () => () => {
      const orphans = uploadedUrls.current.filter(
        (url) => !keptUrls.current.includes(url)
      );
      uploadedUrls.current = [];
      if (orphans.length > 0) void discardUploads(orphans);
    },
    []
  );

  return { createUploadHandler, keep };
}
