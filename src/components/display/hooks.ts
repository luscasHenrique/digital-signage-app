// src/components/display/hooks.ts
"use client";

import { useEffect, useState } from "react";

/** true quando o mouse/teclado fica parado por `timeoutMs`. */
export function useIdle(timeoutMs: number): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), timeoutMs);
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);

  return idle;
}

/**
 * Impede que a tela apague ou entre em repouso enquanto exibe anúncios.
 * O navegador solta o bloqueio quando a aba fica oculta; ele é pedido de novo ao voltar.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
      } catch {
        // Sem permissão (ex.: aba em segundo plano): tenta de novo ao voltar.
      }
    };

    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, []);
}
