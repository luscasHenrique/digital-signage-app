"use client"; // Componentes de erro precisam ser componentes de cliente

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { reportClientError } from "@/lib/errors/reporter";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportClientError(error, { context: { kind: "error-boundary" } });
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <Card
        variant="strong"
        padding="lg"
        className="flex max-w-md flex-col items-center gap-3 text-center"
      >
        <span className="grid size-12 place-items-center rounded-full bg-[var(--lg-danger-soft)] text-destructive">
          <AlertTriangle size={22} />
        </span>
        <h2 className="text-[length:var(--lg-text-xl)]">
          Ops! Algo deu errado.
        </h2>
        <p className="text-muted-foreground">
          Não foi possível carregar esta página. Por favor, tente novamente.
        </p>
        <Button leftIcon={<RotateCcw />} onClick={() => reset()}>
          Tentar novamente
        </Button>
      </Card>
    </div>
  );
}
