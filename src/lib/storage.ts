// src/lib/storage.ts
// Regras do bucket de anúncios, compartilhadas entre client e server.

export const ADVERTISEMENTS_BUCKET = "advertisements";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

/** Retorna uma mensagem de erro se o arquivo não puder ser enviado, ou null se estiver ok. */
export function validateUploadFile(file: {
  type: string;
  size: number;
}): string | null {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return file.size > MAX_IMAGE_BYTES
      ? "A imagem excede o limite de 10 MB."
      : null;
  }
  if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return file.size > MAX_VIDEO_BYTES
      ? "O vídeo excede o limite de 200 MB."
      : null;
  }
  return "Tipo de arquivo não permitido. Use JPG, PNG, WEBP, GIF, AVIF, MP4, WEBM ou OGG.";
}

/** Mantém só caracteres seguros para caminhos do Storage. */
export function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(-100);
  return cleaned || "arquivo";
}

/** Extrai o caminho relativo ao bucket de uma URL pública do próprio Supabase. */
export function extractStoragePathFromPublicUrl(
  url: string | null | undefined,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): string | null {
  try {
    if (!url || !supabaseUrl) return null;

    const u = new URL(url);
    if (u.host !== new URL(supabaseUrl).host) return null;

    const marker = `/storage/v1/object/public/${ADVERTISEMENTS_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;

    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

const OPTIMIZABLE_IMAGE_HOSTS = ["i.ytimg.com"];

/**
 * Indica se a imagem pode passar pelo otimizador do Next (hosts liberados em next.config.ts).
 * Links externos arbitrários são exibidos com `unoptimized`, direto do navegador.
 */
export function isOptimizableImage(
  url: string | null | undefined,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): boolean {
  try {
    if (!url) return false;
    const host = new URL(url).hostname;
    if (supabaseUrl && host === new URL(supabaseUrl).hostname) return true;
    return OPTIMIZABLE_IMAGE_HOSTS.includes(host);
  } catch {
    return false;
  }
}
