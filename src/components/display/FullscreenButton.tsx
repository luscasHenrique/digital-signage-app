// src/components/ui/fullscreen-button.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Maximize } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";

// Interfaces para garantir compatibilidade com diferentes navegadores
interface DocumentWithFullscreen extends Document {
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  msExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}

interface HTMLElementWithFullscreen extends HTMLElement {
  msRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

export function FullscreenButton({ targetId }: { targetId: string }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Função para verificar o estado da tela cheia
  const checkFullscreenStatus = useCallback(() => {
    const doc = document as DocumentWithFullscreen;
    const isFull = !!(
      doc.fullscreenElement ||
      doc.mozFullScreenElement ||
      doc.webkitFullscreenElement ||
      doc.msFullscreenElement
    );
    setIsFullscreen(isFull);
  }, []);

  // Adiciona listeners para detectar mudanças no estado de tela cheia (ex: usuário apertando ESC)
  useEffect(() => {
    document.addEventListener("fullscreenchange", checkFullscreenStatus);
    document.addEventListener("webkitfullscreenchange", checkFullscreenStatus);
    document.addEventListener("mozfullscreenchange", checkFullscreenStatus);
    document.addEventListener("MSFullscreenChange", checkFullscreenStatus);

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreenStatus);
      document.removeEventListener(
        "webkitfullscreenchange",
        checkFullscreenStatus
      );
      document.removeEventListener(
        "mozfullscreenchange",
        checkFullscreenStatus
      );
      document.removeEventListener("MSFullscreenChange", checkFullscreenStatus);
    };
  }, [checkFullscreenStatus]);

  // Função para alternar a tela cheia
  const handleToggleFullscreen = () => {
    const targetElement = document.getElementById(
      targetId
    ) as HTMLElementWithFullscreen;
    const doc = document as DocumentWithFullscreen;

    if (!targetElement) return;

    if (isFullscreen) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
    } else {
      if (targetElement.requestFullscreen) targetElement.requestFullscreen();
      else if (targetElement.mozRequestFullScreen)
        targetElement.mozRequestFullScreen();
      else if (targetElement.webkitRequestFullscreen)
        targetElement.webkitRequestFullscreen();
      else if (targetElement.msRequestFullscreen)
        targetElement.msRequestFullscreen();
    }
  };

  // ✅ A mágica acontece aqui: o botão só é renderizado se NÃO estiver em tela cheia.
  if (isFullscreen) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="lg-glass-strong rounded-full">
        <Button
          onClick={handleToggleFullscreen}
          variant="ghost"
          size="lg"
          iconOnly
          aria-label="Entrar em tela cheia"
        >
          <Maximize />
        </Button>
      </div>
    </div>
  );
}
