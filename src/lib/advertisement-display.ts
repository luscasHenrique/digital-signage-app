// src/lib/advertisement-display.ts
import { Advertisement, AdvertisementStatus, AdvertisementType } from "@/types";

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
    ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&rel=0`
    : null;
}

export type AdSchedule = "live" | "scheduled" | "expired" | "inactive";

export const AD_SCHEDULE_LABEL: Record<AdSchedule, string> = {
  live: "No ar",
  scheduled: "Agendado",
  expired: "Expirado",
  inactive: "Inativo",
};

/** Situação do anúncio considerando status e período de exibição. */
export function getAdSchedule(
  ad: Pick<Advertisement, "status" | "start_date" | "end_date">,
  now: Date = new Date()
): AdSchedule {
  if (ad.status !== AdvertisementStatus.ACTIVE) return "inactive";
  if (new Date(ad.start_date) > now) return "scheduled";
  if (new Date(ad.end_date) < now) return "expired";
  return "live";
}

export const AD_TYPE_LABEL: Record<AdvertisementType, string> = {
  [AdvertisementType.IMAGE_UPLOAD]: "Imagem (arquivo)",
  [AdvertisementType.VIDEO_UPLOAD]: "Vídeo (arquivo)",
  [AdvertisementType.IMAGE_LINK]: "Imagem (link)",
  [AdvertisementType.VIDEO_LINK]: "Vídeo (link .mp4)",
  [AdvertisementType.EMBED_LINK]: "YouTube",
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
