// src/actions/companies.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
  is_private: z.boolean().default(false),
  password: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

// Action para CRIAR uma nova empresa
export async function createCompany(data: CompanyFormData) {
  const supabase = createServerClient();
  const validation = companySchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("companies").insert(validation.data);

  if (error) {
    return {
      success: false,
      message: { _server: ["Erro ao criar empresa. O slug já pode existir."] },
    };
  }

  revalidatePath("/dashboard/empresas");
  return { success: true, message: "Empresa criada com sucesso!" };
}

// Action para ATUALIZAR uma empresa
export async function updateCompany(data: CompanyFormData) {
  const supabase = createServerClient();
  const validation = companySchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const { id, ...companyData } = validation.data;
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID da empresa não fornecido."] },
    };
  }

  const { error } = await supabase
    .from("companies")
    .update(companyData)
    .eq("id", id);

  if (error) {
    return {
      success: false,
      message: {
        _server: ["Erro ao atualizar empresa. O slug já pode existir."],
      },
    };
  }

  revalidatePath("/dashboard/empresas");
  return { success: true, message: "Empresa atualizada com sucesso!" };
}

// Action para DELETAR uma empresa
export async function deleteCompany(companyId: string) {
  const supabase = createServerClient();
  if (!companyId) {
    return { success: false, message: "ID da empresa não fornecido." };
  }

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);

  if (error) {
    return { success: false, message: "Erro ao deletar empresa." };
  }

  revalidatePath("/dashboard/empresas");
  return { success: true, message: "Empresa deletada com sucesso!" };
}
