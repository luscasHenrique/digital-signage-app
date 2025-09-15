// src/components/admin/users/UserForm.tsx
"use client";

import { createUser, updateUser } from "@/actions/users";
import { LoadingButton } from "@/components/ui/loading-button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Importa os tipos centralizados
import { UserWithProfile, UserRole } from "@/types";

const userFormSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(3, "O nome completo é obrigatório."),
  email: z.string().email("O e-mail fornecido é inválido."),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres.")
    .optional()
    .or(z.literal("")),
  role: z.nativeEnum(UserRole),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  initialData: UserWithProfile | null;
  onSuccess: () => void;
}

export function UserForm({ initialData, onSuccess }: UserFormProps) {
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

  const onSubmit = async (data: UserFormData) => {
    const action = initialData ? updateUser : createUser;
    const result = await action(data);

    if (result.success) {
      if (typeof result.message === "string") {
        toast.success(result.message);
      }
      onSuccess();
    } else {
      if (result.message && typeof result.message === "object") {
        Object.entries(result.message).forEach(([key, value]) => {
          if (key === "_server") {
            toast.error(value.join(", "));
          } else {
            form.setError(key as keyof UserFormData, {
              message: value.join(", "),
            });
          }
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={
                    initialData ? "Deixe em branco para não alterar" : ""
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Função</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                  <SelectItem value={UserRole.STANDARD}>Padrão</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton type="submit" loading={form.formState.isSubmitting}>
          {initialData ? "Salvar Alterações" : "Criar Usuário"}
        </LoadingButton>
      </form>
    </Form>
  );
}
