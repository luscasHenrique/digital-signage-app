"use client"; // Componentes de erro precisam ser componentes de cliente

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loga o erro para um serviço de monitoramento (ex: Sentry)
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h2 className="text-2xl font-bold mb-4">Ops! Algo deu errado.</h2>
      <p className="text-muted-foreground mb-6">
        Não foi possível carregar esta página. Por favor, tente novamente.
      </p>
      <Button
        onClick={
          // Tenta renderizar a página novamente
          () => reset()
        }
      >
        Tentar Novamente
      </Button>
    </div>
  );
}
