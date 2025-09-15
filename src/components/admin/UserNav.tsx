// src/components/admin/UserNav.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleUser } from "lucide-react";
import { Button } from "../ui/button";
import { logout } from "@/actions/auth";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation"; // Importa o hook de navegação
import { useState } from "react";
import { toast } from "sonner";

interface UserNavProps {
  user: User;
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter(); // Inicializa o hook
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const result = await logout(); // 1. Chama a action

    if (result.status === "success") {
      toast.info(result.message); // 2. Mostra a notificação
      router.push("/login"); // 3. AQUI ESTÁ A MÁGICA: Redireciona para /login
    }
    // Não é preciso resetar o estado de loading, pois a página será descarregada
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <CircleUser className="h-5 w-5" />
          <span className="sr-only">Toggle user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isLoggingOut}>
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLoggingOut}>Suporte</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full cursor-pointer text-left"
          >
            {isLoggingOut ? "Saindo..." : "Sair"}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
