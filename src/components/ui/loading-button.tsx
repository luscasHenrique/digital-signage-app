// src/components/ui/loading-button.tsx
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react"; // 1. Importar o React

// 2. Usamos o tipo do React para herdar as propriedades de um botão HTML.
// Isso já inclui a propriedade 'children' e todas as outras.
interface LoadingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
}

export function LoadingButton({
  loading,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    // Desabilitamos o botão quando 'loading' for true.
    <Button disabled={loading} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
