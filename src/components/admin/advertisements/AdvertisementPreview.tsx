// src/components/admin/advertisements/AdvertisementPreview.tsx
import Image from "next/image";
import { Film } from "lucide-react";
import {
  getYoutubeThumbnailUrl,
  isVideoType,
} from "@/lib/ads/advertisement";
import { isOptimizableImage } from "@/lib/storage";
import { Advertisement, AdvertisementType } from "@/types";

/** Miniatura do anúncio: a imagem, a capa do vídeo ou a capa do YouTube. */
export function AdvertisementPreview({
  ad,
  sizes,
}: {
  ad: Pick<Advertisement, "type" | "title" | "content_url" | "thumbnail_url">;
  sizes: string;
}) {
  const src =
    ad.type === AdvertisementType.IMAGE_LINK ||
    ad.type === AdvertisementType.IMAGE_UPLOAD
      ? ad.content_url
      : ad.thumbnail_url?.trim() || getYoutubeThumbnailUrl(ad.content_url);

  if (!src) {
    return (
      <div className="grid size-full place-items-center bg-muted text-subtle-foreground">
        <Film className="size-8" />
      </div>
    );
  }

  return (
    <>
      <Image
        src={src}
        alt=""
        fill
        unoptimized={!isOptimizableImage(src)}
        className="object-cover"
        sizes={sizes}
      />
      {isVideoType(ad.type) || ad.type === AdvertisementType.EMBED_LINK ? (
        <span className="absolute bottom-2 left-2 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
          <Film className="size-3.5" />
        </span>
      ) : null}
    </>
  );
}
