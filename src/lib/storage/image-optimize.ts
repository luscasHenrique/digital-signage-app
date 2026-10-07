// src/lib/storage/image-optimize.ts
// Reduz imagens no navegador antes do upload: TVs exibem no máximo 4K, então
// fotos de celular (5–10 MB, 4000+ px) viram WebP com o lado maior em 3840 px.

/**
 * Tamanho aceito no seletor de arquivo. Passa do limite do Storage (10 MB)
 * porque a imagem é reduzida antes do envio; o limite real vale para o resultado.
 */
export const MAX_IMAGE_SOURCE_BYTES = 30 * 1024 * 1024;

/** Lado maior máximo (4K). */
export const MAX_IMAGE_SIDE = 3840;
/** Abaixo disso e dentro do tamanho máximo, a imagem vai como está. */
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;
const WEBP_QUALITY = 0.85;

/** GIF perderia a animação e AVIF já é mais compacto que WebP. */
const CONVERTIBLE = ["image/jpeg", "image/png", "image/webp"];

/** Dimensões que cabem em `max` x `max` mantendo a proporção. */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_SIDE
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

export function webpFileName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") + ".webp";
}

/**
 * Devolve uma versão menor da imagem (ou o próprio arquivo, se não valer a pena
 * ou o navegador não conseguir converter).
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  if (!CONVERTIBLE.includes(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const target = fitWithin(bitmap.width, bitmap.height);
    const needsResize =
      target.width !== bitmap.width || target.height !== bitmap.height;
    if (!needsResize && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    // Navegador sem WebP no canvas devolve PNG: nesse caso mantém o original
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) {
      return file;
    }
    return new File([blob], webpFileName(file.name), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
