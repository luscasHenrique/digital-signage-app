// src/components/admin/companies/CompanyForm.tsx
"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompany, updateCompany } from "@/actions/companies";
import { Button } from "@/components/ui/Button/Button";
import { Select } from "@/components/ui/Select/Select";
import { Switch } from "@/components/ui/Switch/Switch";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/Toast";
import { applyActionErrors } from "@/lib/form-errors";
import { companySchema, type CompanyFormData } from "@/lib/schemas";
import { Company, type DisplayTransition } from "@/types";

interface CompanyFormProps {
  initialData: Company | null;
  onSuccess: () => void;
}

const transitionOptions: {
  value: DisplayTransition;
  label: string;
  description: string;
}[] = [
  {
    value: "slideFromRight",
    label: "Deslizar",
    description: "O próximo anúncio entra pela direita.",
  },
  { value: "fade", label: "Esmaecer", description: "Troca suave por opacidade." },
  {
    value: "zoomIn",
    label: "Aproximar",
    description: "O próximo anúncio cresce até ocupar a tela.",
  },
];

/** Gera um slug a partir do nome: "Loja São José" → "loja-sao-jose". */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CompanyForm({ initialData, onSuccess }: CompanyFormProps) {
  const toast = useToast();
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      is_private: initialData?.is_private || false,
      transition: initialData?.transition ?? "slideFromRight",
      password: "",
    },
  });
  const { errors, isSubmitting, dirtyFields } = form.formState;
  const isPrivate = form.watch("is_private");

  const onSubmit = async (data: CompanyFormData) => {
    const action = initialData ? updateCompany : createCompany;
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
        name="name"
        render={({ field }) => (
          <TextField
            {...field}
            label="Nome da empresa"
            placeholder="Ex.: Loja Centro"
            required
            error={errors.name?.message}
            onChange={(e) => {
              field.onChange(e);
              // Sugere o slug enquanto o usuário não o editou manualmente
              if (!initialData && !dirtyFields.slug) {
                form.setValue("slug", slugify(e.target.value));
              }
            }}
          />
        )}
      />

      <Controller
        control={form.control}
        name="slug"
        render={({ field }) => (
          <TextField
            {...field}
            label="Endereço da tela"
            placeholder="loja-centro"
            required
            leftIcon={<span className="text-sm">/display/</span>}
            hint="Apenas letras minúsculas, números e hífens."
            error={errors.slug?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="transition"
        render={({ field }) => (
          <Select
            label="Transição entre anúncios"
            options={transitionOptions}
            value={field.value}
            onValueChange={(value) =>
              value && field.onChange(value as DisplayTransition)
            }
            error={errors.transition?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="is_private"
        render={({ field }) => (
          <Switch
            name={field.name}
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
            label="Página privada"
            description="Exige uma senha para abrir a tela desta empresa."
          />
        )}
      />

      {isPrivate && (
        <Controller
          control={form.control}
          name="password"
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              type="password"
              autoComplete="new-password"
              label="Senha de acesso"
              placeholder={
                initialData?.is_private
                  ? "Deixe em branco para não alterar"
                  : "Senha para a página"
              }
              required={!initialData?.is_private}
              error={errors.password?.message}
            />
          )}
        />
      )}

      <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
        {initialData ? "Salvar alterações" : "Criar empresa"}
      </Button>
    </form>
  );
}
