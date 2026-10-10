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

/** Embed de vídeo para a tela (YouTube ou Vimeo); null se o link não for suportado. */
export function getEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return getYoutubeEmbedUrl(url) ?? getVimeoEmbedUrl(url);
}

/**
 * Confere se o link combina com o tipo escolhido (null = ok). Evita salvar um
 * anúncio que a TV não consegue tocar, como um link do YouTube em "Vídeo (link)".
 */
export function contentUrlProblem(
  type: AdvertisementType,
  url: string
): string | null {
  const isEmbed = !!getEmbedUrl(url);
  if (type === AdvertisementType.EMBED_LINK && !isEmbed) {
    return "Use um link de vídeo do YouTube ou do Vimeo.";
  }
  if (
    (type === AdvertisementType.VIDEO_LINK ||
      type === AdvertisementType.IMAGE_LINK) &&
    isEmbed
  ) {
    return "Links do YouTube/Vimeo usam o tipo \"YouTube / Vimeo\".";
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
  [AdvertisementType.VIDEO_LINK]: "Vídeo (link .mp4)",
  [AdvertisementType.EMBED_LINK]: "YouTube / Vimeo",
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
