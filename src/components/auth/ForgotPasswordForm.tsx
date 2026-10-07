// src/components/auth/ForgotPasswordForm.tsx
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { requestPasswordReset } from "@/actions/account";
import { Alert } from "@/components/ui/Alert/Alert";
import { AuthCard } from "@/components/ui/Auth/AuthCard";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import styles from "./auth.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setSubmitting(false);
    if (result.success) setSent(result.message);
    else setError(result.message);
  };

  return (
    <AuthCard
      logo={
        <span className={styles.logo}>
          <KeyRound size={20} />
        </span>
      }
      title="Esqueci minha senha"
      subtitle="Informe o e-mail da sua conta. Vamos enviar um link para criar uma nova senha."
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success">{sent}</Alert>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <TextField
            type="email"
            label="E-mail"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            error={error}
          />
          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Enviar link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
