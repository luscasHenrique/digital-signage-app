// src/components/auth/PasswordForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { verifyCompanyPassword } from "@/actions/companies";
import { AuthCard } from "@/components/ui/Auth/AuthCard";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import styles from "./auth.module.css";

export function PasswordForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError("A senha é obrigatória.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await verifyCompanyPassword({ slug, password });
    setSubmitting(false);

    if (result.success) {
      // Recarrega para a página validar o novo cookie e liberar o display
      router.refresh();
    } else {
      setError(result.message);
    }
  };

  return (
    <AuthCard
      logo={
        <span className={styles.logo}>
          <Lock size={20} />
        </span>
      }
      title="Acesso restrito"
      subtitle="Insira a senha para visualizar esta página de anúncios."
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          type="password"
          label="Senha de acesso"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          error={error}
        />
        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
