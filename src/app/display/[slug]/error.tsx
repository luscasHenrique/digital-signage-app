"use client"; // Componentes de erro precisam ser componentes de cliente

import { useEffect } from "react";
import { DisplayError } from "@/components/display/DisplayError";

export default function DisplayErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <DisplayError />;
}
