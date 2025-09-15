// src/lib/supabase/server.ts
import {
  createServerClient as createSupabaseServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerClient() {
  // 1. Tratamento de Erro: Verifica se as variáveis de ambiente essenciais existem.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }

  const cookieStore = cookies();

  return createSupabaseServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll();
      },
      async setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            (await cookieStore).set(name, value, options);
          }
        } catch (error) {
          // 2. Tratamento de Erro: Adiciona um log para o caso de falha.
          console.error(
            "Falha ao tentar definir os cookies do Supabase no servidor:",
            error
          );
        }
      },
    },
  });
}
