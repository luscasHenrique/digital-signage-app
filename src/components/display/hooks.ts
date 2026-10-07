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
 * Registra o service worker que mantém o display funcionando sem internet
 * (ver public/sw-display.js). Só em produção: no dev ele atrapalharia o HMR.
 */
export function useOfflineSupport(slug: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
      .origin;
    navigator.serviceWorker
      .register(
        `/sw-display.js?supabase=${encodeURIComponent(supabaseOrigin)}`,
        { scope: "/display/" }
      )
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Guarda já a página e a lista atual (sem esperar o próximo refetch)
        // Scripts/CSS/fontes/imagens já baixados antes do worker assumir a página
        const assets = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter(
            (url) =>
              url.includes("/_next/static/") || url.includes("/_next/image")
          );
        registration.active?.postMessage({
          type: "warm",
          page: window.location.pathname,
          api: `/api/display/${encodeURIComponent(slug)}`,
          assets,
        });
      })
      .catch((error) =>
        console.warn("Não foi possível ativar o modo offline:", error)
      );
  }, [slug]);
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
