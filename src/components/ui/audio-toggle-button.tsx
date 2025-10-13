// src/components/ui/audio-toggle-button.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AudioToggleButtonProps {
  isMuted: boolean;
  onToggleAudio: () => void;
  hasAudioTrack: boolean;
}

export function AudioToggleButton({
  isMuted,
  onToggleAudio,
  hasAudioTrack,
}: AudioToggleButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const showAndFadeButton = () => {
      setIsVisible(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
    };

    showAndFadeButton();
    window.addEventListener("mousemove", showAndFadeButton);
    window.addEventListener("touchstart", showAndFadeButton);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener("mousemove", showAndFadeButton);
      window.removeEventListener("touchstart", showAndFadeButton);
    };
  }, []);

  if (!hasAudioTrack) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-5 left-5 z-50"
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAudio();
            }}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-background/70 backdrop-blur-sm"
            aria-label={isMuted ? "Ativar som" : "Desativar som"}
          >
            {isMuted ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
