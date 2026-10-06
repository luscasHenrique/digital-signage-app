"use client";

import type { ReactNode } from "react";
import { Alert } from "../Alert/Alert";
import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { LockIcon, MailIcon } from "../_internal/icons";
import { TextField } from "../TextField/TextField";
import { AuthCard, SocialButtons, type SocialProvider } from "./AuthCard";
import { useForm } from "./useForm";
import { email, required } from "./validators";
import styles from "./Auth.module.css";

export type LoginValues = { email: string; password: string; remember: boolean };

export type LoginFormProps = {
  /** Lance um Error para exibir a mensagem no topo do formulário */
  onSubmit: (values: LoginValues) => void | Promise<void>;
  onForgotPassword?: () => void;
  onSignUpClick?: () => void;
  socialProviders?: SocialProvider[];
  logo?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  submitLabel?: string;
  defaultEmail?: string;
  showRemember?: boolean;
  bare?: boolean;
  className?: string;
};

export function LoginForm({
  onSubmit,
  onForgotPassword,
  onSignUpClick,
  socialProviders,
  logo,
  title = "Bem-vindo de volta",
  subtitle = "Entre com sua conta para continuar",
  submitLabel = "Entrar",
  defaultEmail = "",
  showRemember = true,
  bare,
  className,
}: LoginFormProps) {
  const form = useForm<LoginValues>(
    { email: defaultEmail, password: "", remember: false },
    {
      email: [required("Informe seu e-mail"), email()],
      password: [required("Informe sua senha")],
    },
  );

  return (
    <AuthCard
      logo={logo}
      title={title}
      subtitle={subtitle}
      bare={bare}
      className={className}
      footer={
        onSignUpClick && (
          <>
            Não tem uma conta?{" "}
            <button type="button" className={styles.inlineLink} onClick={onSignUpClick}>
              Criar conta
            </button>
          </>
        )
      }
    >
      {socialProviders?.length ? <SocialButtons providers={socialProviders} disabled={form.submitting} /> : null}

      <form className={styles.form} onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {form.formError && (
          <Alert tone="danger" onClose={() => form.setFormError(null)}>
            {form.formError}
          </Alert>
        )}

        <TextField
          {...form.field("email")}
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          leftIcon={<MailIcon />}
          size="lg"
          disabled={form.submitting}
        />

        <TextField
          {...form.field("password")}
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          leftIcon={<LockIcon />}
          size="lg"
          disabled={form.submitting}
          labelAction={
            onForgotPassword && (
              <button type="button" className={styles.inlineLink} onClick={onForgotPassword}>
                Esqueceu a senha?
              </button>
            )
          }
        />

        {showRemember && (
          <Checkbox
            label="Manter conectado"
            size="sm"
            checked={form.values.remember}
            onChange={(e) => form.setValue("remember", e.target.checked)}
            disabled={form.submitting}
          />
        )}

        <Button type="submit" size="lg" fullWidth loading={form.submitting}>
          {submitLabel}
        </Button>
      </form>
    </AuthCard>
  );
}
