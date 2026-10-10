// src/components/display/hooks.ts
"use client";

import { useEffect, useState } from "react";
import {
  dropExpired,
  loadCounts,
  nextBatch,
  saveCounts,
  subtractSent,
} from "./play-counter";

/** Estado da conexão do aparelho (eventos online/offline do navegador). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

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

const PLAYS_FLUSH_MS = 5 * 60_000;

/**
 * Envia a contagem de exibições (relatório) a cada 5 min e ao sair da página.
 * O que não for enviado fica guardado e vai na próxima vez.
 */
export function usePlayStatsFlush(slug: string) {
  useEffect(() => {
    let sending = false;

    const flush = async () => {
      if (sending) return;
      sending = true;
      try {
        saveCounts(slug, dropExpired(loadCounts(slug), new Date()));
        // Depois de muitos dias offline a fila pode passar do limite da API:
        // envia em lotes até esvaziar (ou até a rede falhar)
        for (let round = 0; round < 20; round++) {
          const { items, sent } = nextBatch(loadCounts(slug));
          if (items.length === 0) break;
          const res = await fetch(
            `/api/display/${encodeURIComponent(slug)}/plays`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items }),
              // Continua mesmo se a página estiver sendo fechada
              keepalive: true,
            }
          );
          if (!res.ok) break;
          saveCounts(slug, subtractSent(loadCounts(slug), sent));
        }
      } catch {
        // Sem rede: tenta de novo no próximo ciclo
      } finally {
        sending = false;
      }
    };

    const id = setInterval(flush, PLAYS_FLUSH_MS);
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
    };
  }, [slug]);
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
