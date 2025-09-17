// src/actions/companies.ts
"use server";

import { createActionClient } from "@/lib/supabase/server";
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
  const supabase = createActionClient();
  const validation = companySchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const { error } = await supabase.from("companies").insert(validation.data);

    if (error) throw error;

    revalidatePath("/dashboard/empresas");
    return { success: true, message: "Empresa criada com sucesso!" };
  } catch (error) {
    console.error("ERRO AO CRIAR EMPRESA:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      success: false,
      message: { _server: [`Erro ao criar empresa. ${errorMessage}`] },
    };
  }
}

// Action para ATUALIZAR uma empresa
export async function updateCompany(data: CompanyFormData) {
  const supabase = createActionClient();
  const validation = companySchema.safeParse(data);

  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const { id, ...companyData } = validation.data;
    if (!id) {
      throw new Error("ID da empresa não fornecido.");
    }

    const { error } = await supabase
      .from("companies")
      .update(companyData)
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/dashboard/empresas");
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error) {
    console.error("ERRO AO ATUALIZAR EMPRESA:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      success: false,
      message: { _server: [`Erro ao atualizar empresa. ${errorMessage}`] },
    };
  }
}

// Action para DELETAR uma empresa
export async function deleteCompany(companyId: string) {
  const supabase = createActionClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    if (!companyId) {
      throw new Error("ID da empresa não fornecido.");
    }

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (error) throw error;

    revalidatePath("/dashboard/empresas");
    return { success: true, message: "Empresa deletada com sucesso!" };
  } catch (error) {
    console.error("ERRO AO DELETAR EMPRESA:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return { success: false, message: errorMessage };
  }
}
