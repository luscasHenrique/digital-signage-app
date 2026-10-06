"use client";

import type { ReactNode } from "react";
import { Alert } from "../Alert/Alert";
import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { LockIcon, MailIcon, UserIcon } from "../_internal/icons";
import { TextField } from "../TextField/TextField";
import { AuthCard, SocialButtons, type SocialProvider } from "./AuthCard";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { useForm } from "./useForm";
import { email, matches, minLength, required, type Validator } from "./validators";
import styles from "./Auth.module.css";

export type SignUpValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export type SignUpFormProps = {
  onSubmit: (values: Omit<SignUpValues, "confirmPassword">) => void | Promise<void>;
  onSignInClick?: () => void;
  socialProviders?: SocialProvider[];
  logo?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  submitLabel?: string;
  /** Texto do aceite de termos. Passe null para ocultar o checkbox. */
  termsLabel?: ReactNode | null;
  minPasswordLength?: number;
  showStrength?: boolean;
  bare?: boolean;
  className?: string;
};

const mustAccept: Validator = (v) => (v ? null : "Você precisa aceitar os termos");

export function SignUpForm({
  onSubmit,
  onSignInClick,
  socialProviders,
  logo,
  title = "Criar conta",
  subtitle = "Leva menos de um minuto",
  submitLabel = "Criar conta",
  termsLabel = "Li e aceito os Termos de Uso e a Política de Privacidade",
  minPasswordLength = 8,
  showStrength = true,
  bare,
  className,
}: SignUpFormProps) {
  const form = useForm<SignUpValues>(
    { name: "", email: "", password: "", confirmPassword: "", acceptTerms: false },
    {
      name: [required("Informe seu nome"), minLength(2, "Nome muito curto")],
      email: [required("Informe seu e-mail"), email()],
      password: [required("Crie uma senha"), minLength(minPasswordLength)],
      confirmPassword: (v) => [required("Confirme sua senha"), matches(() => v.password, "As senhas não coincidem")],
      acceptTerms: termsLabel === null ? [] : [mustAccept],
    },
  );

  const confirmOk =
    form.values.confirmPassword.length > 0 &&
    form.values.confirmPassword === form.values.password &&
    !form.errors.confirmPassword;

  return (
    <AuthCard
      logo={logo}
      title={title}
      subtitle={subtitle}
      bare={bare}
      className={className}
      footer={
        onSignInClick && (
          <>
            Já tem uma conta?{" "}
            <button type="button" className={styles.inlineLink} onClick={onSignInClick}>
              Entrar
            </button>
          </>
        )
      }
    >
      {socialProviders?.length ? <SocialButtons providers={socialProviders} disabled={form.submitting} /> : null}

      <form
        className={styles.form}
        noValidate
        onSubmit={form.handleSubmit(({ name, email, password, acceptTerms }) => onSubmit({ name, email, password, acceptTerms }))}
      >
        {form.formError && (
          <Alert tone="danger" onClose={() => form.setFormError(null)}>
            {form.formError}
          </Alert>
        )}

        <TextField
          {...form.field("name")}
          label="Nome completo"
          autoComplete="name"
          placeholder="Como devemos te chamar?"
          leftIcon={<UserIcon />}
          size="lg"
          disabled={form.submitting}
        />

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

        <div className={styles.stack}>
          <TextField
            {...form.field("password")}
            label="Senha"
            type="password"
            autoComplete="new-password"
            placeholder={`Mínimo de ${minPasswordLength} caracteres`}
            leftIcon={<LockIcon />}
            size="lg"
            disabled={form.submitting}
          />
          {showStrength && form.values.password && <PasswordStrengthMeter password={form.values.password} />}
        </div>

        <TextField
          {...form.field("confirmPassword")}
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          placeholder="Repita a senha"
          leftIcon={<LockIcon />}
          size="lg"
          success={confirmOk}
          disabled={form.submitting}
        />

        {termsLabel !== null && (
          <Checkbox
            label={termsLabel}
            size="sm"
            checked={form.values.acceptTerms}
            error={form.errors.acceptTerms ?? undefined}
            onChange={(e) => form.setValue("acceptTerms", e.target.checked)}
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
