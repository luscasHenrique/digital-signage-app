// src/components/admin/companies/CompanyForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription, // 1. Importar o FormDescription
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Company } from "@/types";
import { createCompany, updateCompany } from "@/actions/companies";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const companySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  slug: z
    .string()
    .min(3, "O slug deve ter pelo menos 3 caracteres.")
    .regex(
      /^[a-z0-9-]+$/,
      "O slug deve conter apenas letras minúsculas, números e hifens."
    ),
  is_private: z.boolean(),
  password: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  initialData: Company | null;
  onSuccess: () => void;
}

export function CompanyForm({ initialData, onSuccess }: CompanyFormProps) {
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      is_private: initialData?.is_private || false,
      password: "",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    if (!data.is_private) {
      data.password = "";
    }
    const action = initialData ? updateCompany : createCompany;
    const result = await action(data);

    if (result.success) {
      if (typeof result.message === "string") toast.success(result.message);
      onSuccess();
    } else {
      if (result.message && typeof result.message === "object") {
        Object.entries(result.message).forEach(([key, value]) => {
          if (key === "_server") toast.error(value.join(", "));
          else
            form.setError(key as keyof CompanyFormData, {
              message: value.join(", "),
            });
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Minha Empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug da URL</FormLabel>
              <FormControl>
                <Input placeholder="Ex: minha-empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_private"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Página Privada</FormLabel>
                <FormDescription>
                  Marque para exigir uma senha de acesso a esta página de
                  anúncios.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    setIsPrivate(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {isPrivate && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha de Acesso</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={
                      initialData
                        ? "Deixe em branco para não alterar"
                        : "Senha para a página"
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <LoadingButton
          type="submit"
          loading={form.formState.isSubmitting}
          className="w-full"
        >
          {initialData ? "Salvar Alterações" : "Criar Empresa"}
        </LoadingButton>
      </form>
    </Form>
  );
}
