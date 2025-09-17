"use client";

import { Advertisement, AdvertisementType, OverlayPosition } from "@/types";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
// ATUALIZADO: Importa 'motion', 'AnimatePresence', e o tipo 'Variants'
import { motion, AnimatePresence, Variants, Transition } from "framer-motion";

// ATUALIZADO: Presets de animação agora são tipados com 'Variants'
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

// ATUALIZADO: Objeto separado para as propriedades de transição
const transitionSettings: Record<string, Transition> = {
  fade: { duration: 1.5 },
  slideFromRight: { duration: 1, ease: "easeInOut" },
  zoomIn: { duration: 1 },
};

type AnimationType = keyof typeof animationPresets;

interface CompanyDisplayProps {
  ads: Advertisement[];
  animationType?: AnimationType;
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
}: CompanyDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentAd = ads[currentIndex];
  // Pega os presets corretos com base na prop
  const selectedAnimation = animationPresets[animationType];
  const selectedTransition = transitionSettings[animationType];

  // --- LÓGICA DE EFEITOS (sem alterações) ---
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const duration = (currentAd?.duration_seconds || 10) * 1000;
    const slideshowTimer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, duration);
    return () => clearTimeout(slideshowTimer);
  }, [currentIndex, currentAd, ads.length]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .catch((error) => console.warn("Autoplay bloqueado:", error));
    }
  }, [currentAd]);

  // --- RENDERIZAÇÃO DO CONTEÚDO (sem alterações) ---
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

      case AdvertisementType.EMBED_LINK:
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
            ></iframe>
          );
        }
        return (
          <div className="text-white">Preview indisponível para este link.</div>
        );

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
          // ATUALIZADO: Usa as props 'variants' e 'transition'
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
          className={`absolute w-full p-4 text-center text-2xl font-bold z-10
            ${
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
