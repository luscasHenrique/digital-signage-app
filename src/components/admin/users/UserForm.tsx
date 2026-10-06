// src/components/admin/users/UserForm.tsx
"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser, updateUser } from "@/actions/users";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";
import { applyActionErrors } from "@/lib/form-errors";
import { userFormSchema, type UserFormData } from "@/lib/schemas";
import { UserRole, UserWithProfile } from "@/types";

interface UserFormProps {
  initialData: UserWithProfile | null;
  onSuccess: () => void;
}

const roleOptions = [
  {
    value: UserRole.STANDARD,
    label: "Padrão",
    description: "Gerencia anúncios e empresas.",
  },
  {
    value: UserRole.ADMIN,
    label: "Administrador",
    description: "Também gerencia usuários e vê a auditoria.",
  },
];

export function UserForm({ initialData, onSuccess }: UserFormProps) {
  const toast = useToast();
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      full_name: initialData?.full_name || "",
      email: initialData?.email || "",
      password: "",
      role: initialData?.role || UserRole.STANDARD,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (data: UserFormData) => {
    const action = initialData ? updateUser : createUser;
    const result = await action(data);

    if (result.success) {
      toast.success(result.message);
      onSuccess();
    } else {
      applyActionErrors(result.message, form.setError, toast.error);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
      noValidate
    >
      <Controller
        control={form.control}
        name="full_name"
        render={({ field }) => (
          <TextField
            {...field}
            label="Nome completo"
            autoComplete="name"
            required
            error={errors.full_name?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="email"
        render={({ field }) => (
          <TextField
            {...field}
            type="email"
            label="E-mail"
            autoComplete="email"
            required
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <TextField
            {...field}
            value={field.value ?? ""}
            type="password"
            label="Senha"
            autoComplete="new-password"
            placeholder={
              initialData ? "Deixe em branco para não alterar" : undefined
            }
            hint={initialData ? undefined : "Mínimo de 6 caracteres."}
            required={!initialData}
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="role"
        render={({ field }) => (
          <Select
            label="Função"
            name={field.name}
            options={roleOptions}
            value={field.value}
            onValueChange={(value) => value && field.onChange(value)}
            error={errors.role?.message}
            required
          />
        )}
      />

      <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
        {initialData ? "Salvar alterações" : "Criar usuário"}
      </Button>
    </form>
  );
}
