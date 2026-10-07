"use client"; // Componentes de erro precisam ser componentes de cliente

import { useEffect } from "react";
import { DisplayError } from "@/components/display/DisplayError";
import { reportClientError } from "@/lib/error-reporter";

export default function DisplayErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
    reportClientError(error, {
      source: "display",
      context: { kind: "error-boundary" },
    });
  }, [error]);

  return <DisplayError />;
}
