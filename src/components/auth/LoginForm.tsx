// src/components/auth/LoginForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { MonitorPlay } from "lucide-react";
import { login } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert/Alert";
import { LoginForm as GlassLoginForm } from "@/components/ui/Auth/LoginForm";
import { useToast } from "@/components/ui/Toast/Toast";
import styles from "./auth.module.css";

export function LoginForm({ message }: { message?: string }) {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className={styles.stack}>
      {message && <Alert tone="danger">{message}</Alert>}
      <GlassLoginForm
        logo={
          <span className={styles.logo}>
            <MonitorPlay size={22} />
          </span>
        }
        title="Entrar no painel"
        subtitle="Digite seu e-mail e senha para gerenciar seus anúncios."
        submitLabel="Entrar"
        showRemember={false}
        onForgotPassword={() => router.push("/recuperar-senha")}
        onSubmit={async ({ email, password }) => {
          const formData = new FormData();
          formData.append("email", email);
          formData.append("password", password);

          const result = await login(formData);
          // O LoginForm exibe a mensagem de erros lançados
          if (!result.success) throw new Error(result.message);

          toast.success(result.message);
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
