// src/lib/ads/advertisement.ts
import { Advertisement, AdvertisementStatus, AdvertisementType } from "@/types";
import {
  isWithinWeeklySchedule,
  type WeeklySchedule,
} from "@/lib/ads/weekly-schedule";

export function getYoutubeVideoId(
  url: string | null | undefined
): string | null {
  try {
    if (!url) return null;
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");

    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const match = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
      if (match) return match[2];
    }
    return null;
  } catch {
    return null;
  }
}

export function getYoutubeThumbnailUrl(url: string): string | null {
  const id = getYoutubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** URL de embed em loop, sem som e sem controles (próprio para telas). */
export function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeVideoId(url);
  return id
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0&playsinline=1&iv_load_policy=3&disablekb=1`
    : null;
}

/** ID (e hash de vídeo não listado) de um link do Vimeo. */
export function getVimeoVideo(
  url: string | null | undefined
): { id: string; hash: string | null } | null {
  try {
    if (!url) return null;
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "player.vimeo.com") {
      const match = u.pathname.match(/^\/video\/(\d+)/);
      return match ? { id: match[1], hash: u.searchParams.get("h") } : null;
    }
    if (host !== "vimeo.com") return null;
    // vimeo.com/123, vimeo.com/123/abcdef (não listado), vimeo.com/channels/x/123
    const parts = u.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => /^\d+$/.test(part));
    if (index < 0) return null;
    const hash = parts[index + 1];
    return {
      id: parts[index],
      hash: hash && /^[0-9a-f]+$/i.test(hash) ? hash : null,
    };
  } catch {
    return null;
  }
}

/** Embed do Vimeo em modo "background": sem som, sem controles, em loop. */
export function getVimeoEmbedUrl(url: string): string | null {
  const video = getVimeoVideo(url);
  if (!video) return null;
  const hash = video.hash ? `&h=${video.hash}` : "";
  return `https://player.vimeo.com/video/${video.id}?background=1&autoplay=1&muted=1&loop=1${hash}`;
}

/**
 * Aceita o código de incorporação colado inteiro (`<iframe src="...">`) e
 * devolve só o endereço. Qualquer outro texto volta como veio (sem espaços).
 */
export function normalizeContentUrl(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  const src = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(text)?.[1];
  return (src ?? text).replace(/&amp;/g, "&");
}

function parseUrl(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * Plataformas de vídeo conhecidas: o link da página vira o player próprio
 * para telas (sem som, em loop quando a plataforma permite).
 * `parentHost` é exigido pela Twitch (o domínio que exibe o player).
 */
export function getPlatformEmbedUrl(
  url: string | null | undefined,
  parentHost = "localhost"
): string | null {
  if (!url) return null;
  const youtube = getYoutubeEmbedUrl(url) ?? getVimeoEmbedUrl(url);
  if (youtube) return youtube;

  const u = parseUrl(url);
  if (!u) return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  // Dailymotion: dailymotion.com/video/ID, dai.ly/ID
  if (host === "dailymotion.com" || host === "dai.ly") {
    const id = host === "dai.ly" ? parts[0] : parts[0] === "video" ? parts[1] : null;
    if (id && !parts.includes("embed")) {
      return `https://www.dailymotion.com/embed/video/${id.split("_")[0]}?autoplay=1&mute=1&controls=0&queue-enable=0`;
    }
    if (parts[0] === "embed") return url;
  }

  // Loom: loom.com/share/ID
  if (host === "loom.com" && (parts[0] === "share" || parts[0] === "embed") && parts[1]) {
    return `https://www.loom.com/embed/${parts[1]}?autoplay=1&muted=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;
  }

  // Google Drive: drive.google.com/file/d/ID/view → /preview
  if (host === "drive.google.com" && parts[0] === "file" && parts[1] === "d" && parts[2]) {
    return `https://drive.google.com/file/d/${parts[2]}/preview`;
  }

  // Streamable: streamable.com/ID
  if (host === "streamable.com" && parts[0]) {
    const id = parts[0] === "e" ? parts[1] : parts[0];
    if (id) return `https://streamable.com/e/${id}?autoplay=1&muted=1&loop=1&nocontrols=1`;
  }

  // Twitch: canal ao vivo, vídeo gravado ou clipe
  if (host === "twitch.tv" || host === "clips.twitch.tv") {
    const p = `parent=${encodeURIComponent(parentHost)}&autoplay=true&muted=true`;
    if (host === "clips.twitch.tv" && parts[0]) {
      return `https://clips.twitch.tv/embed?clip=${parts[0]}&${p}`;
    }
    if (parts[1] === "clip" && parts[2]) {
      return `https://clips.twitch.tv/embed?clip=${parts[2]}&${p}`;
    }
    if (parts[0] === "videos" && parts[1]) {
      return `https://player.twitch.tv/?video=${parts[1]}&${p}`;
    }
    if (parts[0]) return `https://player.twitch.tv/?channel=${parts[0]}&${p}`;
  }

  // Facebook: vídeos e reels públicos
  if ((host === "facebook.com" || host === "fb.watch") && !u.pathname.startsWith("/plugins/")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true&mute=true&show_text=false`;
  }

  return null;
}

/**
 * Endereço que a tela abre num iframe: plataforma conhecida convertida para
 * o player dela; qualquer outro link https (ou código <iframe> colado) é
 * usado como está.
 */
export function getEmbedUrl(
  url: string | null | undefined,
  parentHost?: string
): string | null {
  if (!url) return null;
  const normalized = normalizeContentUrl(url);
  return (
    getPlatformEmbedUrl(normalized, parentHost) ??
    (parseUrl(normalized)?.protocol === "https:" ? normalized : null)
  );
}

/**
 * Como a tela mostra um link de vídeo: arquivo direto (<video>) ou página de
 * uma plataforma (iframe). Um link do YouTube em "Vídeo (link)" também toca.
 */
export function isPlatformVideoUrl(url: string | null | undefined): boolean {
  return !!getPlatformEmbedUrl(normalizeContentUrl(url));
}

/** Converte links de compartilhamento em link direto do arquivo (Dropbox). */
export function directVideoUrl(url: string): string {
  const u = parseUrl(url);
  if (!u) return url;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "dropbox.com") {
    u.searchParams.delete("dl");
    u.searchParams.set("raw", "1");
    return u.toString();
  }
  return url;
}

/**
 * Confere se o link combina com o tipo escolhido (null = ok). Evita salvar um
 * anúncio que a TV não consegue mostrar, como uma página de vídeo em "Imagem (link)".
 */
export function contentUrlProblem(
  type: AdvertisementType,
  url: string
): string | null {
  if (type === AdvertisementType.EMBED_LINK) {
    return getEmbedUrl(url)
      ? null
      : "Use um link https de um vídeo ou o código <iframe> de incorporação.";
  }
  if (type === AdvertisementType.IMAGE_LINK && isPlatformVideoUrl(url)) {
    return "Este link é de um vídeo: use o tipo \"Vídeo (link)\" ou \"Vídeo incorporado\".";
  }
  return null;
}

export type AdSchedule =
  | "live"
  | "offHours"
  | "scheduled"
  | "expired"
  | "inactive";

export const AD_SCHEDULE_LABEL: Record<AdSchedule, string> = {
  live: "No ar",
  offHours: "Fora do horário",
  scheduled: "Agendado",
  expired: "Expirado",
  inactive: "Inativo",
};

/** Situação do anúncio considerando status, período e dias/horários. */
export function getAdSchedule(
  ad: Pick<Advertisement, "status" | "start_date" | "end_date"> &
    WeeklySchedule,
  now: Date = new Date()
): AdSchedule {
  if (ad.status !== AdvertisementStatus.ACTIVE) return "inactive";
  if (new Date(ad.start_date) > now) return "scheduled";
  if (new Date(ad.end_date) < now) return "expired";
  return isWithinWeeklySchedule(ad, now) ? "live" : "offHours";
}

export const AD_TYPE_LABEL: Record<AdvertisementType, string> = {
  [AdvertisementType.IMAGE_UPLOAD]: "Imagem (arquivo)",
  [AdvertisementType.VIDEO_UPLOAD]: "Vídeo (arquivo)",
  [AdvertisementType.IMAGE_LINK]: "Imagem (link)",
  [AdvertisementType.VIDEO_LINK]: "Vídeo (link)",
  [AdvertisementType.EMBED_LINK]: "Vídeo incorporado (embed)",
};

export function isUploadType(type: AdvertisementType | undefined): boolean {
  return (
    type === AdvertisementType.IMAGE_UPLOAD ||
    type === AdvertisementType.VIDEO_UPLOAD
  );
}

export function isVideoType(type: AdvertisementType | undefined): boolean {
  return (
    type === AdvertisementType.VIDEO_UPLOAD ||
    type === AdvertisementType.VIDEO_LINK
  );
}

/** Último instante do dia (23:59:59.999, horário local): o anúncio vale o dia final inteiro. */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
