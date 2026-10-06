// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase para o servidor (Server Components, Server Actions e Route Handlers).
 * Em Server Components a escrita de cookies não é permitida: o erro é ignorado,
 * porque o middleware já renova a sessão a cada navegação no painel.
 */
export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookieStore;
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          );
        } catch {
          // Chamado a partir de um Server Component: sem permissão para gravar cookies.
        }
      },
    },
  });
};

/** Mesmo cliente; o nome deixa explícito o uso em Server Actions (que podem gravar cookies). */
export const createActionClient = createClient;
