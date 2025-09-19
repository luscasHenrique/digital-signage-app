// src/components/display/CompanyDisplay.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, Variants, Transition } from "framer-motion";
import {
  Advertisement,
  AdvertisementStatus,
  AdvertisementType,
  OverlayPosition,
} from "@/types";
import { createClient } from "@/lib/supabase/client";

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

interface CompanyDisplayProps {
  ads: Advertisement[];
  animationType?: AnimationType;
  /** Informe para ativar Realtime nessa empresa (recomendado) */
  companyId?: string;
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

  // ---- Realtime + Refetch (opcional com companyId) ----
  const refetch = useCallback(async () => {
    if (!companyId) return;

    const nowIso = new Date().toISOString();

    // 1) Busca os IDs de anúncios vinculados à empresa
    const { data: links, error: linkErr } = await supabase
      .from("advertisements_companies")
      .select("advertisement_id")
      .eq("company_id", companyId);

    if (linkErr) {
      console.error("Erro ao buscar vínculos:", linkErr);
      return;
    }

    const ids = (links ?? []).map((l) => l.advertisement_id) as string[];
    if (ids.length === 0) {
      setAdList([]);
      setCurrentIndex(0);
      return;
    }

    // 2) Busca os anúncios válidos para exibição agora
    const { data: adsData, error: adsErr } = await supabase
      .from("advertisements")
      .select("*")
      .in("id", ids)
      .eq("status", AdvertisementStatus.ACTIVE)
      .lte("start_date", nowIso)
      .gte("end_date", nowIso)
      .order("created_at", { ascending: false });

    if (adsErr) {
      console.error("Erro ao buscar anúncios:", adsErr);
      return;
    }

    const list = (adsData ?? []) as Advertisement[];
    setAdList(list);
    setCurrentIndex((prev) => (list.length > 0 ? prev % list.length : 0));
  }, [companyId, supabase]);

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

  // Inscrições no Realtime (sem ler payload → sem problemas de tipagem)
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`display-realtime-${companyId}`)

      // 1) Vínculos anúncio<->empresa (filtrado pela empresa)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "advertisements_companies",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          debouncedRefetch();
        }
      )

      // 2) Mudanças em anúncios (qualquer UPDATE/DELETE) → refetch
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "advertisements" },
        () => {
          debouncedRefetch();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "advertisements" },
        () => {
          debouncedRefetch();
        }
      )

      // 3) Novos anúncios (INSERT)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "advertisements" },
        () => {
          debouncedRefetch();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, companyId, debouncedRefetch]);

  // Guard de tempo: refetch periódico para cobrir mudanças de janela (start/end)
  useEffect(() => {
    if (!companyId) return;
    const id = setInterval(() => {
      refetch();
    }, 60_000); // 60s (ajuste para 30_000 se quiser mais responsivo)
    return () => clearInterval(id);
  }, [companyId, refetch]);

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
    <main className="h-screen w-screen bg-black relative overflow-hidden text-white">
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
        <div className="text-sm capitalize">
          {now.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>
    </main>
  );
}
