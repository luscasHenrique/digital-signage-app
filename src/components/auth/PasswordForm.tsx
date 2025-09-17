// src/components/auth/PasswordForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { verifyCompanyPassword } from "@/actions/companies";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";

const passwordSchema = z.object({
  password: z.string().min(1, "A senha é obrigatória."),
});
type PasswordSchema = z.infer<typeof passwordSchema>;

export function PasswordForm({ slug }: { slug: string }) {
  const router = useRouter();
  const form = useForm<PasswordSchema>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = async (data: PasswordSchema) => {
    const result = await verifyCompanyPassword({
      slug,
      password: data.password,
    });

    if (result.success) {
      toast.success(result.message);
      // Força um refresh para que o middleware possa revalidar com o novo cookie
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha de Acesso</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          Entrar
        </LoadingButton>
      </form>
    </Form>
  );
}
