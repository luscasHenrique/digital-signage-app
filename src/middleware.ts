//src/middleware.ts

import { createServerClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Cria uma resposta inicial. O middleware precisa retornar ou passar adiante
  // um objeto de resposta.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Cria um cliente Supabase que pode operar dentro do contexto do middleware.
  // Ele usa a resposta para poder ler e escrever cookies.
  const supabase = createServerClient();

  // Atualiza a sessão do usuário com base nos cookies da requisição.
  // Isso é crucial para manter o usuário logado.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // --- LÓGICA DE PROTEÇÃO DE ROTAS ---

  // 1. Se o usuário NÃO está logado e tenta acessar qualquer rota
  //    dentro de "/dashboard", redireciona para a página de login.
  if (!session && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Se o usuário JÁ ESTÁ logado e tenta acessar a página de login,
  //    redireciona para o dashboard.
  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 3. Para todas as outras requisições, permite que continuem normalmente.
  return response;
}

// Configuração do "matcher" para definir em quais rotas o middleware deve rodar.
// Evitamos que ele rode em arquivos estáticos (_next/static), imagens, etc.
export const config = {
  matcher: [
    /*
     * Corresponde a todos os caminhos de requisição, exceto os que começam com:
     * - api (rotas de API)
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico (ícone do site)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
