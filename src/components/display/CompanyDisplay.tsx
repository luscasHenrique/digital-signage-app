// src/components/display/CompanyDisplay.tsx
"use client";

import { Advertisement, AdvertisementType, OverlayPosition } from "@/types";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";

// Tipagem para as propriedades que o componente receberá
interface CompanyDisplayProps {
  ads: Advertisement[];
}

/**
 * Função auxiliar para gerar a URL de embed correta para o YouTube,
 * otimizada para digital signage (autoplay, sem som, sem controles, em loop).
 */
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
    // Parâmetros otimizados para exibição contínua
    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0`
      : null;
  } catch {
    return null;
  }
}

export function CompanyDisplay({ ads }: CompanyDisplayProps) {
  // --- GERENCIAMENTO DE ESTADO ---
  const [currentIndex, setCurrentIndex] = useState(0); // Controla qual anúncio está na tela
  const [now, setNow] = useState(new Date()); // Controla o relógio
  const videoRef = useRef<HTMLVideoElement>(null); // Referência para controlar vídeos de upload

  // Pega o anúncio atual da lista
  const currentAd = ads[currentIndex];

  // --- LÓGICA DE EFEITOS ---

  // Efeito #1: O Relógio
  // Roda um timer para atualizar a data e a hora a cada segundo.
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer); // Limpa o timer ao sair da página
  }, []);

  // Efeito #2: A Playlist (Slideshow)
  // Roda um timer para avançar para o próximo anúncio.
  useEffect(() => {
    // Não precisa de timer se houver apenas um anúncio
    if (ads.length <= 1) return;

    // Pega a duração do anúncio atual (em milissegundos), ou usa 10s como padrão.
    const duration = (currentAd?.duration_seconds || 10) * 1000;

    const slideshowTimer = setTimeout(() => {
      // Avança para o próximo índice, voltando a 0 se chegar ao fim da lista
      setCurrentIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, duration);

    return () => clearTimeout(slideshowTimer); // Limpa o timer ao trocar de anúncio
  }, [currentIndex, currentAd, ads.length]);

  // Efeito #3: Autoplay para Vídeos de Upload
  // Garante que vídeos de upload direto comecem a tocar.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .catch((error) => console.warn("Autoplay bloqueado:", error));
    }
  }, [currentAd]);

  // --- RENDERIZAÇÃO DO CONTEÚDO ---

  // Função que decide o que renderizar (imagem, vídeo, etc.)
  const renderAdContent = () => {
    if (!currentAd) {
      // Fallback caso não haja anúncio
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
            className="object-cover" // 'cover' para preencher a tela inteira
            priority // Otimiza o carregamento da imagem principal
          />
        );

      case AdvertisementType.VIDEO_UPLOAD:
      case AdvertisementType.VIDEO_LINK:
        return (
          <video
            ref={videoRef}
            key={currentAd.id} // Força o elemento a ser recriado ao mudar o vídeo
            src={currentAd.content_url}
            muted
            autoPlay
            loop
            playsInline // Essencial para autoplay em alguns navegadores móveis
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
        // Fallback se a URL for inválida
        return (
          <div className="text-white">Preview indisponível para este link.</div>
        );

      default:
        return null;
    }
  };

  return (
    <main className="h-screen w-screen bg-black relative overflow-hidden text-white">
      {/* Camada 1: O Conteúdo Principal */}
      <div className="absolute inset-0 z-0">{renderAdContent()}</div>

      {/* Camada 2: O Overlay (Aviso) */}
      {currentAd?.overlay_text && (
        <div
          className={`absolute w-full p-4 text-center text-2xl font-bold z-10
            ${
              currentAd.overlay_position === OverlayPosition.TOP
                ? "top-0"
                : "bottom-0"
            }
          `}
          style={{
            backgroundColor: currentAd.overlay_bg_color || "rgba(0,0,0,0.5)",
            color: currentAd.overlay_text_color || "white",
          }}
        >
          {currentAd.overlay_text}
        </div>
      )}

      {/* Camada 3: O Relógio e a Data */}
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
