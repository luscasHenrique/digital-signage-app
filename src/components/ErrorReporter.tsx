// src/components/ErrorReporter.tsx
"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errors/reporter";

/** Captura erros não tratados do navegador (inclusive de promises). */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Erros de carregamento de recurso (img/vídeo) não trazem `error`
      if (!event.error && !event.message) return;
      reportClientError(event.error ?? event.message, {
        context: { kind: "window.onerror", line: event.lineno, col: event.colno },
      });
    };
    const onRejection = (event: PromiseRejectionEvent) =>
      reportClientError(event.reason, {
        context: { kind: "unhandledrejection" },
      });

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
