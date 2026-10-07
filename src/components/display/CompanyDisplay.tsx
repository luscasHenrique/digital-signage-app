// src/components/display/CompanyDisplay.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getYoutubeEmbedUrl } from "@/lib/ads/advertisement";
import { isPlayableNow } from "@/lib/ads/weekly-schedule";
import { reportClientError } from "@/lib/errors/reporter";
import { isOptimizableImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { ThemeScope } from "@/components/ui/Theme/ThemeScope";
import { AdvertisementType, OverlayPosition, type DisplayAd } from "@/types";
import { DisplayClock } from "./DisplayClock";
import { FullscreenButton } from "./FullscreenButton";
import {
  useIdle,
  useOfflineSupport,
  usePlayStatsFlush,
  useWakeLock,
} from "./hooks";
import { addPlay, loadCounts, saveCounts } from "./play-counter";
import styles from "./CompanyDisplay.module.css";

type AnimationType = "fade" | "slideFromRight" | "zoomIn";

interface CompanyDisplayProps {
  ads: DisplayAd[];
  animationType?: AnimationType;
  companyId: string;
  slug: string;
}

const REFRESH_INTERVAL_MS = 30_000;
/** Intervalo máximo entre tentativas quando o servidor não responde. */
const MAX_REFRESH_INTERVAL_MS = 5 * 60_000;
/** Depois de um erro de mídia com um único anúncio, tenta carregar de novo. */
const MEDIA_RETRY_MS = 60_000;
/** Limite para vídeos longos (ou que nunca disparam `ended`). */
const MAX_VIDEO_MS = 5 * 60_000;
/** De quanto em quanto tempo confere a programação (dias/horários). */
const SCHEDULE_TICK_MS = 30_000;
const DEFAULT_DURATION_SECONDS = 10;
/** Tempo da animação de troca (precisa bater com o CSS). */
const TRANSITION_MS = 1000;

export function CompanyDisplay({
  ads,
  animationType = "fade",
  companyId,
  slug,
}: CompanyDisplayProps) {
  // Lista vinda do servidor; a playlist é o que pode passar agora
  const [allAds, setAllAds] = useState<DisplayAd[]>(ads);
  const [clock, setClock] = useState(() => Date.now());
  const adList = usePlaylist(allAds, clock);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Slide que está saindo: fica na tela durante a animação de troca
  const [leaving, setLeaving] = useState<DisplayAd | null>(null);
  // Mídia do único anúncio falhou: mostra aviso e tenta de novo depois
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  // Vídeos tocam até o fim, mas só avançam depois da duração mínima
  const minElapsedRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);
  const idle = useIdle(3000);
  useWakeLock();
  useOfflineSupport(slug);
  usePlayStatsFlush(slug);
  // Com um único anúncio na tela, conta uma exibição a cada "duração"
  const [playCycle, setPlayCycle] = useState(0);

  // Se o servidor mandar novos `ads`, ressincroniza
  useEffect(() => {
    setAllAds(ads);
    setCurrentIndex(0);
  }, [ads]);

  // Programação semanal: a playlist muda sozinha ao entrar/sair do horário
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), SCHEDULE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // A playlist encolheu: volta ao início
  useEffect(() => {
    if (currentIndex >= adList.length && currentIndex !== 0) {
      setCurrentIndex(0);
    }
  }, [adList.length, currentIndex]);

  useEffect(() => setFailed(false), [adList]);

  const currentAd = adList[currentIndex] as DisplayAd | undefined;
  const nextAd =
    adList.length > 1 ? adList[(currentIndex + 1) % adList.length] : undefined;

  const goNext = useCallback(() => {
    if (adList.length <= 1) return;
    setLeaving(adList[currentIndex] ?? null);
    setCurrentIndex((prev) => (prev + 1) % adList.length);
  }, [adList, currentIndex]);

  // Slideshow: cada anúncio fica pelo tempo configurado. Vídeos não são
  // cortados no meio: a duração vira o tempo mínimo e a troca acontece no fim.
  useEffect(() => {
    minElapsedRef.current = false;
    const ad = adList[currentIndex];
    const ms = (ad?.duration_seconds || DEFAULT_DURATION_SECONDS) * 1000;
    if (adList.length === 1) {
      const id = setInterval(() => setPlayCycle((c) => c + 1), ms);
      return () => clearInterval(id);
    }
    if (adList.length === 0) return;

    if (ad && isVideo(ad)) {
      const minTimer = setTimeout(() => (minElapsedRef.current = true), ms);
      const maxTimer = setTimeout(goNext, Math.max(ms, MAX_VIDEO_MS));
      return () => {
        clearTimeout(minTimer);
        clearTimeout(maxTimer);
      };
    }

    const timer = setTimeout(goNext, ms);
    return () => clearTimeout(timer);
  }, [adList, currentIndex, goNext]);

  // Relatório: cada anúncio que entra na tela conta uma exibição
  const currentAdId = adList[currentIndex]?.id;
  useEffect(() => {
    if (!currentAdId || failed) return;
    saveCounts(slug, addPlay(loadCounts(slug), currentAdId, new Date()));
  }, [slug, currentAdId, currentIndex, playCycle, failed]);

  /** Fim do vídeo: avança se já cumpriu a duração; senão o vídeo recomeça. */
  const handleVideoEnded = useCallback(() => {
    if (adList.length > 1 && minElapsedRef.current) {
      goNext();
      return true;
    }
    return false;
  }, [adList.length, goNext]);

  // Mídia com erro: pula para o próximo; se for o único, mostra um aviso
  const handleMediaError = useCallback(() => {
    const ad = adList[currentIndex];
    if (ad) {
      reportClientError(new Error(`Mídia não carregou: ${ad.title}`), {
        source: "display",
        context: { slug, adId: ad.id, type: ad.type, url: ad.content_url },
      });
    }
    if (adList.length > 1) goNext();
    else setFailed(true);
  }, [adList, currentIndex, goNext, slug]);

  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(() => {
      setFailed(false);
      setRetryKey((k) => k + 1);
    }, MEDIA_RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed]);

  // Remove o slide anterior quando a animação termina
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  // ---- Refetch (a API do servidor valida o acesso) + Realtime ----
  // ETag da última resposta: se nada mudou, o servidor responde 304 sem corpo.
  const etagRef = useRef<string | null>(null);

  /** Retorna false quando a requisição falha (para espaçar as tentativas). */
  const refetch = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/display/${encodeURIComponent(slug)}`, {
        cache: "no-store",
        headers: etagRef.current ? { "If-None-Match": etagRef.current } : {},
      });

      // Senha trocada ou acesso expirado: volta para a tela de senha.
      if (res.status === 401) {
        window.location.href = `/display/${slug}/auth`;
        return true;
      }
      if (res.status === 304) return true;
      if (!res.ok) {
        console.error("Erro ao buscar anúncios:", res.status);
        return false;
      }

      etagRef.current = res.headers.get("ETag");
      const { ads: list } = (await res.json()) as { ads: DisplayAd[] };
      setAllAds((current) => (sameAds(current, list) ? current : list));
      return true;
    } catch (error) {
      // Falha de rede: mantém a lista atual na tela.
      console.error("Erro ao buscar anúncios:", error);
      return false;
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
  // Pausa com a aba oculta e espaça as tentativas enquanto o servidor falha.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = REFRESH_INTERVAL_MS;
    let stopped = false;

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") return;
      timer = setTimeout(async () => {
        const ok = await refetch();
        delay = ok
          ? REFRESH_INTERVAL_MS
          : Math.min(delay * 2, MAX_REFRESH_INTERVAL_MS);
        schedule();
      }, delay);
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void refetch();
      schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  return (
    <ThemeScope theme="dark">
      <main
        id="fullscreen-display"
        className={styles.screen}
        data-idle={idle || undefined}
      >
        {currentAd && failed ? (
          <p className={styles.empty}>Conteúdo indisponível no momento.</p>
        ) : currentAd ? (
          <>
            {/* Mesma key (id) do slide que estava na tela: o React reaproveita o
                elemento, e vídeo/iframe não recarregam durante a saída */}
            {leaving && leaving.id !== currentAd.id && (
              <Slide
                key={`${leaving.id}-${retryKey}`}
                ad={leaving}
                phase="exit"
                animation={animationType}
              />
            )}
            <Slide
              key={`${currentAd.id}-${retryKey}`}
              ad={currentAd}
              phase={leaving ? "enter" : "idle"}
              animation={animationType}
              onError={handleMediaError}
              onVideoEnded={handleVideoEnded}
            />
            {/* Carrega a próxima mídia antes da troca (evita tela preta) */}
            {nextAd && nextAd.id !== currentAd.id && (
              <div className={styles.preload} aria-hidden="true">
                {isImage(nextAd) && <AdImage ad={nextAd} />}
                {isVideo(nextAd) && (
                  <video src={nextAd.content_url} preload="auto" muted />
                )}
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
  onVideoEnded,
}: {
  ad: DisplayAd;
  phase: "enter" | "exit" | "idle";
  animation: AnimationType;
  onError?: () => void;
  onVideoEnded?: () => boolean;
}) {
  return (
    <div
      className={styles.slide}
      data-phase={phase}
      data-animation={animation}
      aria-hidden={phase === "exit" || undefined}
    >
      <AdContent
        ad={ad}
        active={phase !== "exit"}
        onError={onError}
        onVideoEnded={onVideoEnded}
      />

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

function isImage(ad: DisplayAd) {
  return (
    ad.type === AdvertisementType.IMAGE_UPLOAD ||
    ad.type === AdvertisementType.IMAGE_LINK
  );
}

function isVideo(ad: DisplayAd) {
  return (
    ad.type === AdvertisementType.VIDEO_UPLOAD ||
    ad.type === AdvertisementType.VIDEO_LINK
  );
}

function AdImage({ ad, onError }: { ad: DisplayAd; onError?: () => void }) {
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
  onVideoEnded,
}: {
  ad: DisplayAd;
  active: boolean;
  onError?: () => void;
  /** Retorna true se o player avançou; senão o vídeo recomeça. */
  onVideoEnded?: () => boolean;
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

  if (isVideo(ad)) {
    return (
      <video
        ref={videoRef}
        src={ad.content_url}
        muted
        autoPlay
        playsInline
        className="size-full object-cover"
        onError={onError}
        onEnded={(e) => {
          if (onVideoEnded?.()) return;
          const video = e.currentTarget;
          video.currentTime = 0;
          void video.play().catch(() => {});
        }}
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

/**
 * Anúncios que podem passar agora (período + dias/horários). Mantém a mesma
 * referência enquanto o conteúdo não muda, para não reiniciar o slideshow.
 */
function usePlaylist(ads: DisplayAd[], clock: number): DisplayAd[] {
  const previous = useRef<DisplayAd[]>([]);
  return useMemo(() => {
    const now = new Date(clock);
    const next = ads.filter((ad) => isPlayableNow(ad, now));
    const same =
      next.length === previous.current.length &&
      next.every((ad, i) => ad === previous.current[i]);
    if (!same) previous.current = next;
    return previous.current;
  }, [ads, clock]);
}

/** Evita reiniciar o slideshow quando o refetch traz exatamente os mesmos anúncios. */
function sameAds(a: DisplayAd[], b: DisplayAd[]) {
  return a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
}
