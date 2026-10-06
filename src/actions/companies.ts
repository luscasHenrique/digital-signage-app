// src/actions/companies.ts
"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { companySchema, type CompanyFormData } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  hashPassword,
  passwordFingerprint,
  verifyPassword,
} from "@/lib/password";
import {
  DISPLAY_TOKEN_MAX_AGE_SECONDS,
  createDisplayToken,
  displayTokenCookieName,
} from "@/lib/display-token";
import { createRateLimiter } from "@/lib/rate-limit";

type FieldErrors = Record<string, string[] | undefined>;
type FormActionResult =
  | { success: true; message: string }
  | { success: false; message: FieldErrors };

const NOT_AUTHENTICATED: FormActionResult = {
  success: false,
  message: { _server: ["Usuário não autenticado."] },
};

// Action para CRIAR uma nova empresa
export async function createCompany(
  data: CompanyFormData
): Promise<FormActionResult> {
  const validation = companySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const ctx = await getAuthContext();
  if (!ctx) return NOT_AUTHENTICATED;

  try {
    const { name, slug, is_private, password } = validation.data;

    const { error } = await ctx.supabase.from("companies").insert({
      name,
      slug,
      is_private,
      password: is_private && password ? await hashPassword(password) : "",
    });
    if (error) throw error;

    revalidatePath("/dashboard/empresas");
    return { success: true, message: "Empresa criada com sucesso!" };
  } catch (error) {
    console.error("ERRO AO CRIAR EMPRESA:", error);
    return {
      success: false,
      message: { _server: [`Erro ao criar empresa. ${errorMessage(error)}`] },
    };
  }
}

// Action para ATUALIZAR uma empresa
export async function updateCompany(
  data: CompanyFormData
): Promise<FormActionResult> {
  const validation = companySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: validation.error.flatten().fieldErrors };
  }

  const ctx = await getAuthContext();
  if (!ctx) return NOT_AUTHENTICATED;

  const { id, name, slug, is_private, password } = validation.data;
  if (!id) {
    return {
      success: false,
      message: { _server: ["ID da empresa não fornecido."] },
    };
  }

  try {
    const update: Record<string, unknown> = { name, slug, is_private };

    if (!is_private) {
      update.password = "";
    } else if (password) {
      update.password = await hashPassword(password);
    } else {
      // Senha em branco na edição = manter a atual. Só é erro se a empresa ainda não tiver senha.
      const { data: current, error: fetchErr } = await supabaseAdmin
        .from("companies")
        .select("password")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!current?.password) {
        return {
          success: false,
          message: { password: ["Defina uma senha para a página privada."] },
        };
      }
    }

    const { error } = await ctx.supabase
      .from("companies")
      .update(update)
      .eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/empresas");
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error) {
    console.error("ERRO AO ATUALIZAR EMPRESA:", error);
    return {
      success: false,
      message: {
        _server: [`Erro ao atualizar empresa. ${errorMessage(error)}`],
      },
    };
  }
}

// Action para DELETAR uma empresa
export async function deleteCompany(
  companyId: string
): Promise<{ success: boolean; message: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { success: false, message: "Usuário não autenticado." };
  if (!companyId) {
    return { success: false, message: "ID da empresa não fornecido." };
  }

  try {
    const { error } = await ctx.supabase
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (error) throw error;

    revalidatePath("/dashboard/empresas");
    return { success: true, message: "Empresa deletada com sucesso!" };
  } catch (error) {
    console.error("ERRO AO DELETAR EMPRESA:", error);
    return { success: false, message: errorMessage(error) };
  }
}

const verifyPasswordSchema = z.object({
  slug: z.string(),
  password: z.string().min(1, "A senha é obrigatória."),
});

// 5 tentativas a cada 15 minutos por IP + empresa
const passwordAttempts = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
});

export async function verifyCompanyPassword(
  data: z.infer<typeof verifyPasswordSchema>
): Promise<{ success: boolean; message: string }> {
  const validation = verifyPasswordSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const { slug, password } = validation.data;

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  const rateKey = `${ip}:${slug}`;

  const attempt = passwordAttempts.consume(rateKey);
  if (!attempt.allowed) {
    const minutes = Math.ceil(attempt.retryAfterMs / 60000);
    return {
      success: false,
      message: `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`,
    };
  }

  try {
    // Service role: a coluna password não precisa ser legível pelo cliente.
    const { data: company, error } = await supabaseAdmin
      .from("companies")
      .select("id, password")
      .eq("slug", slug)
      .eq("is_private", true)
      .maybeSingle();
    if (error) throw error;

    // Mesma resposta para empresa inexistente e senha errada.
    const { valid, needsRehash } = await verifyPassword(
      password,
      company?.password
    );
    if (!company || !valid) {
      return { success: false, message: "Senha incorreta." };
    }

    let storedPassword: string = company.password;
    if (needsRehash) {
      // Migra senha legada (texto puro) para hash.
      const hashed = await hashPassword(password);
      const { error: rehashErr } = await supabaseAdmin
        .from("companies")
        .update({ password: hashed })
        .eq("id", company.id);
      if (rehashErr) {
        console.warn("Falha ao migrar senha para hash:", rehashErr);
      } else {
        storedPassword = hashed;
      }
    }

    passwordAttempts.reset(rateKey);

    const token = await createDisplayToken(
      slug,
      passwordFingerprint(storedPassword)
    );
    (await cookies()).set(displayTokenCookieName(slug), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DISPLAY_TOKEN_MAX_AGE_SECONDS,
    });

    return { success: true, message: "Acesso concedido." };
  } catch (error) {
    console.error("Erro ao verificar senha da empresa:", error);
    return { success: false, message: "Não foi possível verificar a senha." };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}
