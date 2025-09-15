// src/components/auth/LoginForm.tsx
"use client";

import { login } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoadingButton } from "../ui/loading-button";
import { useRouter } from "next/navigation";

// Esquema de validação com Zod
const loginSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

type LoginSchema = z.infer<typeof loginSchema>;

export function LoginForm({ message }: { message?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  // Função que será chamada ao submeter o formulário
  const handleLogin = async (data: LoginSchema) => {
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    // Chama a server action
    const result = await login(formData);

    // Exibe o toast e redireciona com base no resultado da action
    if (result.status === "success") {
      toast.success(result.message);
      router.push("/dashboard");
    } else {
      toast.error(result.message);
    }
  };

  return (
    // Usamos o handleSubmit do react-hook-form
    <form onSubmit={handleSubmit(handleLogin)} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      {message && !errors.email && !errors.password && (
        <p className="text-sm text-red-500 text-center">{message}</p>
      )}

      {/* Usando nosso novo LoadingButton! */}
      <LoadingButton type="submit" className="w-full" loading={isSubmitting}>
        Entrar
      </LoadingButton>
    </form>
  );
}
