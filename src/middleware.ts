import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Mantém a sessão do Supabase atualizada e protege o painel.
// Papéis (ADMIN) são verificados nas páginas e Server Actions (src/lib/auth.ts);
// o acesso a displays privados é verificado em src/lib/display.ts.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Grava todos os cookies de uma vez: o token de sessão pode vir dividido
        // em vários cookies, e recriar a resposta a cada um perderia os anteriores.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  try {
    // getUser() valida o token no servidor do Supabase (getSession() não valida).
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && pathname.startsWith("/dashboard")) {
      return redirectKeepingCookies("/login", request, response);
    }
    if (user && pathname === "/login") {
      return redirectKeepingCookies("/dashboard", request, response);
    }
  } catch (error) {
    console.error("Erro no middleware:", error);
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

/** Redireciona sem perder os cookies de sessão que o Supabase acabou de renovar. */
function redirectKeepingCookies(
  path: string,
  request: NextRequest,
  from: NextResponse
) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
