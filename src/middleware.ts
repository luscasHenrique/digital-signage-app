// src/middleware.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Cria uma resposta inicial que será usada e, se necessário, modificada.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Cria um cliente Supabase específico para o contexto do Middleware.
  // A mágica está neste objeto de 'cookies', que ensina o Supabase
  // a ler da 'request' e escrever na 'response'.
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // O middleware atualiza o cookie na requisição e na resposta.
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        // O middleware remove o cookie na requisição e na resposta.
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // Força a atualização da sessão do usuário. Essencial para o middleware.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // --- SUA LÓGICA DE PROTEÇÃO DE ROTAS (JÁ ESTAVA CORRETA) ---

  // 1. Redireciona para /login se não houver sessão e o acesso for ao /dashboard
  if (!session && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. Redireciona para /dashboard se houver sessão e o acesso for ao /login
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Permite a continuação da requisição.
  // Retorna a 'response' que pode ter sido atualizada com novos cookies.
  return response;
}

// A sua configuração de 'matcher' já estava correta.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
