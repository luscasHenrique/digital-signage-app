// src/components/admin/account/AccountClient.tsx
"use client";

import { useState, type FormEvent } from "react";
import { updateOwnName, updateOwnPassword } from "@/actions/account";
import { PageHeader } from "@/components/admin/PageHeader";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";

interface AccountClientProps {
  email: string;
  fullName: string;
  /** Chegou pelo link de "esqueci minha senha" */
  resettingPassword: boolean;
}

export function AccountClient({
  email,
  fullName,
  resettingPassword,
}: AccountClientProps) {
  const toast = useToast();

  const [name, setName] = useState(fullName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    setSavingName(true);
    const result = await updateOwnName(name);
    setSavingName(false);
    if (result.success) toast.success(result.message);
    else setNameError(result.message);
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);
    const result = await updateOwnPassword({ password, confirm });
    setSavingPassword(false);
    if (result.success) {
      toast.success(result.message);
      setPassword("");
      setConfirm("");
    } else {
      setPasswordError(result.message);
    }
  };

  return (
    <>
      <PageHeader title="Minha conta" description={email} />

      <div className="grid max-w-2xl gap-5">
        {resettingPassword && (
          <Alert tone="info">Crie uma nova senha para a sua conta.</Alert>
        )}

        <Card variant="strong" padding="lg">
          <form className="flex flex-col gap-4" onSubmit={saveName} noValidate>
            <h2 className="text-[length:var(--lg-text-md)]">Dados</h2>
            <TextField
              label="Nome"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              error={nameError}
            />
            <div>
              <Button
                type="submit"
                loading={savingName}
                disabled={name.trim() === fullName}
              >
                Salvar nome
              </Button>
            </div>
          </form>
        </Card>

        <Card variant="strong" padding="lg">
          <form
            className="flex flex-col gap-4"
            onSubmit={savePassword}
            noValidate
          >
            <h2 className="text-[length:var(--lg-text-md)]">Senha</h2>
            <TextField
              type="password"
              label="Nova senha"
              autoComplete="new-password"
              autoFocus={resettingPassword}
              value={password}
              hint="Mínimo de 6 caracteres."
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
            />
            <TextField
              type="password"
              label="Confirmar nova senha"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              error={passwordError}
            />
            <div>
              <Button
                type="submit"
                loading={savingPassword}
                disabled={!password || !confirm}
              >
                Trocar senha
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
