// src/actions/companies.ts
"use server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { createActionClient, createClient } from "@/lib/supabase/server";
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

const verifyPasswordSchema = z.object({
  slug: z.string(),
  password: z.string().min(1, "A senha é obrigatória."),
});

export async function verifyCompanyPassword(
  data: z.infer<typeof verifyPasswordSchema>
) {
  const validation = verifyPasswordSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const { slug, password } = validation.data;

  // Usamos createClient pois a primeira parte é apenas leitura
  const supabase = createClient();

  try {
    const { data: company, error } = await supabase
      .from("companies")
      .select("password")
      .eq("slug", slug)
      .eq("is_private", true)
      .single();

    if (error || !company) {
      throw new Error("Empresa não encontrada ou não é privada.");
    }

    if (company.password !== password) {
      return { success: false, message: "Senha incorreta." };
    }

    // --- LÓGICA DE CRIAÇÃO DO TOKEN E COOKIE ---

    // 1. Cria o token de acesso (JWT)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY!);
    const token = await new SignJWT({ slug: slug })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("company-access")
      .setIssuedAt()
      .setExpirationTime("1h") // Token válido por 1 hora
      .sign(secret);

    // 2. Salva o token em um cookie
    // CORREÇÃO APLICADA AQUI
    (await cookies()).set(`access_token_${slug}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60, // 1 hora em segundos
    });

    return { success: true, message: "Acesso concedido." };
  } catch (error) {
    console.error("Erro ao verificar senha da empresa:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido.";
    return { success: false, message: errorMessage };
  }
}
