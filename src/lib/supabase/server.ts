// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cria um cliente Supabase para uso em Server Components (pages, layouts).
 * Otimizado para LEITURA de cookies.
 */
export const createClient = () => {
  const cookieStore = cookies();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      // A função 'get' precisa ser 'async' para usar 'await'
      async get(name: string) {
        // Usa 'await' para esperar o objeto de cookies
        return (await cookieStore).get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Vazio de propósito para evitar erros em Server Components
      },
      remove(name: string, options: CookieOptions) {
        // Vazio de propósito para evitar erros em Server Components
      },
    },
  });
};

/**
 * Cria um cliente Supabase para uso em Server Actions e Route Handlers.
 * Com permissão total para LER e ESCREVER cookies.
 */
export const createActionClient = () => {
  const cookieStore = cookies();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      // A função 'get' precisa ser 'async' para usar 'await'
      async get(name: string) {
        // Usa 'await' para esperar o objeto de cookies
        return (await cookieStore).get(name)?.value;
      },
      // A função 'set' precisa ser 'async' para usar 'await'
      async set(name: string, value: string, options: CookieOptions) {
        try {
          // Usa 'await' para esperar o objeto de cookies
          (await cookieStore).set({ name, value, ...options });
        } catch (error) {
          // A variável 'error' agora está sendo usada no console.error
          console.error(
            "Falha ao tentar definir cookie em Server Action/Route Handler:",
            error
          );
        }
      },
      // A função 'remove' precisa ser 'async' para usar 'await'
      async remove(name: string, options: CookieOptions) {
        try {
          // Usa 'await' para esperar o objeto de cookies
          (await cookieStore).set({ name, value: "", ...options });
        } catch (error) {
          // A variável 'error' agora está sendo usada no console.error
          console.error(
            "Falha ao tentar remover cookie em Server Action/Route Handler:",
            error
          );
        }
      },
    },
  });
};
