// src/components/display/DisplayError.tsx
"use client";

import { useEffect, useState } from "react";

const RETRY_SECONDS = 30;

/**
 * Tela de erro do display. A TV fica sem ninguém por perto, então a página
 * se recarrega sozinha até o servidor voltar a responder.
 */
export function DisplayError({
  message = "Erro ao carregar anúncios.",
}: {
  message?: string;
}) {
  const [seconds, setSeconds] = useState(RETRY_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      window.location.reload();
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <main className="grid h-dvh w-screen place-items-center bg-black text-center text-white">
      <div className="flex flex-col gap-2">
        <p>{message}</p>
        <p className="text-sm text-white/60">
          Tentando novamente em {seconds}s…
        </p>
      </div>
    </main>
  );
}
