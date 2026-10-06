// src/components/display/CompanyDisplay.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, Variants, Transition } from "framer-motion";
import {
  Advertisement,
  AdvertisementType,
  OverlayPosition,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import { isOptimizableImage } from "@/lib/storage";
import { FullscreenButton } from "../ui/fullscreen-button";

// ---- Animações ----
const animationPresets: Record<string, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideFromRight: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  zoomIn: {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
  },
};

const transitionSettings: Record<string, Transition> = {
  fade: { duration: 1.5 },
  slideFromRight: { duration: 1, ease: "easeInOut" },
  zoomIn: { duration: 1 },
};

type AnimationType = keyof typeof animationPresets;

const REFRESH_INTERVAL_MS = 30_000;

interface CompanyDisplayProps {
  ads: Advertisement[];
  animationType?: AnimationType;
  companyId: string;
  slug: string;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;
    if (urlObj.hostname === "youtu.be") {
      videoId = urlObj.pathname.slice(1);
    } else if (
      urlObj.hostname === "www.youtube.com" ||
      urlObj.hostname === "youtube.com"
    ) {
      videoId = urlObj.searchParams.get("v");
    }
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0`
      : null;
  } catch {
    return null;
  }
}

export function CompanyDisplay({
  ads,
  animationType = "fade",
  companyId,
  slug,
}: CompanyDisplayProps) {
  // Estado local com os anúncios atuais
  const [adList, setAdList] = useState<Advertisement[]>(ads);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);

  const supabase = useMemo(() => createClient(), []);
  const selectedAnimation = animationPresets[animationType];
  const selectedTransition = transitionSettings[animationType];

  // Se o server mandar novos `ads`, ressincroniza
  useEffect(() => {
    setAdList(ads);
    setCurrentIndex(0);
  }, [ads]);

  // Relógio
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Slideshow
  useEffect(() => {
    if (adList.length <= 1) return;
    const duration = (adList[currentIndex]?.duration_seconds || 10) * 1000;
    const slideshowTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % adList.length);
    }, duration);
    return () => clearTimeout(slideshowTimer);
  }, [currentIndex, adList]);

  // Garantir autoplay do vídeo atual
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .catch((error) => console.warn("Autoplay bloqueado:", error));
    }
  }, [adList, currentIndex]);

  // ---- Refetch (API do servidor valida o acesso) + Realtime ----
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
      setAdList(list);
      setCurrentIndex((prev) => (list.length > 0 ? prev % list.length : 0));
    } catch (error) {
      // Falha de rede: mantém a lista atual na tela.
      console.error("Erro ao buscar anúncios:", error);
    }
  }, [slug]);

  // Debounce para agrupar rajadas de eventos
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
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, companyId, debouncedRefetch]);

  // Refetch periódico: cobre a janela de datas (start/end) e falhas do Realtime.
  useEffect(() => {
    const id = setInterval(() => {
      refetch();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refetch]);

  // ---- Render ----
  if (!adList.length) {
    return (
      <main className="h-screen w-screen bg-black grid place-items-center text-white">
        Nenhum anúncio ativo no momento.
      </main>
    );
  }

  const currentAd = adList[currentIndex];

  const renderAdContent = () => {
    if (!currentAd) {
      return <div className="text-white">Carregando anúncio...</div>;
    }

    switch (currentAd.type) {
      case AdvertisementType.IMAGE_UPLOAD:
      case AdvertisementType.IMAGE_LINK:
        return (
          <Image
            src={currentAd.content_url}
            alt={currentAd.title}
            fill
            className="object-cover"
            priority
            unoptimized={!isOptimizableImage(currentAd.content_url)}
          />
        );

      case AdvertisementType.VIDEO_UPLOAD:
      case AdvertisementType.VIDEO_LINK:
        return (
          <video
            ref={videoRef}
            key={currentAd.id}
            src={currentAd.content_url}
            muted
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        );

      case AdvertisementType.EMBED_LINK: {
        const embedUrl = getYoutubeEmbedUrl(currentAd.content_url);
        if (embedUrl) {
          return (
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title={currentAd.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          );
        }
        return (
          <div className="text-white">Preview indisponível para este link.</div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <main
      id="fullscreen-display"
      className="h-screen w-screen bg-black relative overflow-hidden text-white"
    >
      <AnimatePresence>
        <motion.div
          key={currentAd?.id}
          className="absolute inset-0 z-0"
          variants={selectedAnimation}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={selectedTransition}
        >
          {renderAdContent()}
        </motion.div>
      </AnimatePresence>

      {currentAd?.overlay_text && (
        <div
          className={`absolute w-full p-4 text-center text-2xl font-bold z-10 ${
            currentAd.overlay_position === OverlayPosition.TOP
              ? "top-0"
              : "bottom-0"
          }`}
          style={{
            backgroundColor: currentAd.overlay_bg_color || "rgba(0,0,0,0.5)",
            color: currentAd.overlay_text_color || "white",
          }}
        >
          {currentAd.overlay_text}
        </div>
      )}

      <div className="absolute top-5 right-5 bg-black/50 p-3 rounded-lg text-center z-20">
        <div className="text-4xl font-bold">
          {now.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="text-sm normal-case">
          {now.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      <div className="control-buttons">
        <FullscreenButton targetId="fullscreen-display" />
      </div>
    </main>
  );
}
