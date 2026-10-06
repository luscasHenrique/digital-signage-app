// src/components/display/CompanyDisplay.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getYoutubeEmbedUrl } from "@/lib/advertisement-display";
import { isOptimizableImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { ThemeScope } from "@/components/ui/Theme/ThemeScope";
import { Advertisement, AdvertisementType, OverlayPosition } from "@/types";
import { DisplayClock } from "./DisplayClock";
import { FullscreenButton } from "./FullscreenButton";
import { useIdle, useWakeLock } from "./hooks";
import styles from "./CompanyDisplay.module.css";

type AnimationType = "fade" | "slideFromRight" | "zoomIn";

interface CompanyDisplayProps {
  ads: Advertisement[];
  animationType?: AnimationType;
  companyId: string;
  slug: string;
}

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_DURATION_SECONDS = 10;
/** Tempo da animação de troca (precisa bater com o CSS). */
const TRANSITION_MS = 1000;

export function CompanyDisplay({
  ads,
  animationType = "fade",
  companyId,
  slug,
}: CompanyDisplayProps) {
  const [adList, setAdList] = useState<Advertisement[]>(ads);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Slide que está saindo: fica na tela durante a animação de troca
  const [leaving, setLeaving] = useState<Advertisement | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const idle = useIdle(3000);
  useWakeLock();

  // Se o servidor mandar novos `ads`, ressincroniza
  useEffect(() => {
    setAdList(ads);
    setCurrentIndex(0);
  }, [ads]);

  const currentAd = adList[currentIndex] as Advertisement | undefined;
  const nextAd =
    adList.length > 1 ? adList[(currentIndex + 1) % adList.length] : undefined;

  const goNext = useCallback(() => {
    if (adList.length <= 1) return;
    setLeaving(adList[currentIndex] ?? null);
    setCurrentIndex((prev) => (prev + 1) % adList.length);
  }, [adList, currentIndex]);

  // Slideshow: cada anúncio fica pelo tempo configurado
  useEffect(() => {
    if (adList.length <= 1) return;
    const seconds =
      adList[currentIndex]?.duration_seconds || DEFAULT_DURATION_SECONDS;
    const timer = setTimeout(goNext, seconds * 1000);
    return () => clearTimeout(timer);
  }, [adList, currentIndex, goNext]);

  // Remove o slide anterior quando a animação termina
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  // ---- Refetch (a API do servidor valida o acesso) + Realtime ----
  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });

      // Senha trocada ou acesso expirado: volta para a tela de senha.
      if (res.status === 401) {
        window.location.href = `/display/${slug}/auth`;
        return;
      }
      if (!res.ok) {
        console.error("Erro ao buscar anúncios:", res.status);
        return;
      }

      const { ads: list } = (await res.json()) as { ads: Advertisement[] };
      setAdList((current) => (sameAds(current, list) ? current : list));
      setCurrentIndex((prev) => (list.length > 0 ? prev % list.length : 0));
    } catch (error) {
      // Falha de rede: mantém a lista atual na tela.
      console.error("Erro ao buscar anúncios:", error);
    }
  }, [slug]);

  // Agrupa rajadas de eventos do Realtime num único refetch
  const debouncedRefetch = useMemo(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        refetch();
        t = null;
      }, 300);
    };
  }, [refetch]);

  // Realtime: a tabela display_signals recebe um "toque" (via trigger no banco)
  // sempre que anúncios ou vínculos desta empresa mudam. Só expõe company_id/updated_at.
  useEffect(() => {
    const channel = supabase
      .channel(`display-realtime-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "display_signals",
          filter: `company_id=eq.${companyId}`,
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, companyId, debouncedRefetch]);

  // Refetch periódico: cobre a janela de datas (start/end) e falhas do Realtime.
  useEffect(() => {
    const id = setInterval(refetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  return (
    <ThemeScope theme="dark">
      <main
        id="fullscreen-display"
        className={styles.screen}
        data-idle={idle || undefined}
      >
        {currentAd ? (
          <>
            {/* Mesma key (id) do slide que estava na tela: o React reaproveita o
                elemento, e vídeo/iframe não recarregam durante a saída */}
            {leaving && leaving.id !== currentAd.id && (
              <Slide
                key={leaving.id}
                ad={leaving}
                phase="exit"
                animation={animationType}
              />
            )}
            <Slide
              key={currentAd.id}
              ad={currentAd}
              phase={leaving ? "enter" : "idle"}
              animation={animationType}
              onError={goNext}
            />
            {/* Carrega a próxima imagem antes da troca (evita tela preta) */}
            {nextAd && isImage(nextAd) && nextAd.id !== currentAd.id && (
              <div className={styles.preload} aria-hidden="true">
                <AdImage ad={nextAd} />
              </div>
            )}
          </>
        ) : (
          <p className={styles.empty}>Nenhum anúncio ativo no momento.</p>
        )}

        <div className={styles.clock}>
          <DisplayClock />
        </div>

        <FullscreenButton targetId="fullscreen-display" hidden={idle} />
      </main>
    </ThemeScope>
  );
}

function Slide({
  ad,
  phase,
  animation,
  onError,
}: {
  ad: Advertisement;
  phase: "enter" | "exit" | "idle";
  animation: AnimationType;
  onError?: () => void;
}) {
  return (
    <div
      className={styles.slide}
      data-phase={phase}
      data-animation={animation}
      aria-hidden={phase === "exit" || undefined}
    >
      <AdContent ad={ad} active={phase !== "exit"} onError={onError} />

      {ad.overlay_text && (
        <div
          className={styles.overlay}
          data-position={
            ad.overlay_position === OverlayPosition.TOP ? "top" : "bottom"
          }
          style={{
            backgroundColor: ad.overlay_bg_color || "rgba(0,0,0,0.5)",
            color: ad.overlay_text_color || "white",
          }}
        >
          {ad.overlay_text}
        </div>
      )}
    </div>
  );
}

function isImage(ad: Advertisement) {
  return (
    ad.type === AdvertisementType.IMAGE_UPLOAD ||
    ad.type === AdvertisementType.IMAGE_LINK
  );
}

function AdImage({ ad, onError }: { ad: Advertisement; onError?: () => void }) {
  return (
    <Image
      src={ad.content_url}
      alt={ad.title}
      fill
      sizes="100vw"
      className="object-cover"
      priority
      unoptimized={!isOptimizableImage(ad.content_url)}
      onError={onError}
    />
  );
}

function AdContent({
  ad,
  active,
  onError,
}: {
  ad: Advertisement;
  active: boolean;
  onError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Garante o autoplay (alguns navegadores de TV ignoram o atributo)
  useEffect(() => {
    if (active) {
      videoRef.current
        ?.play()
        .catch((error) => console.warn("Autoplay bloqueado:", error));
    }
  }, [active]);

  if (isImage(ad)) return <AdImage ad={ad} onError={onError} />;

  if (
    ad.type === AdvertisementType.VIDEO_UPLOAD ||
    ad.type === AdvertisementType.VIDEO_LINK
  ) {
    return (
      <video
        ref={videoRef}
        src={ad.content_url}
        muted
        autoPlay
        loop
        playsInline
        className="size-full object-cover"
        onError={onError}
      />
    );
  }

  const embedUrl = getYoutubeEmbedUrl(ad.content_url);
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={ad.title}
        className="size-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
      />
    );
  }

  return <p className={styles.empty}>Conteúdo indisponível para este link.</p>;
}

/** Evita reiniciar o slideshow quando o refetch traz exatamente os mesmos anúncios. */
function sameAds(a: Advertisement[], b: Advertisement[]) {
  return a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
}
