"use server";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { pathname } = request.nextUrl;

    // Lógica de proteção para o /dashboard
    if (!session && pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Lógica para proteger páginas de display
    if (pathname.startsWith("/display/")) {
      const slug = pathname.split("/")[2];
      if (!slug) return response;

      const { data: company } = await supabase
        .from("companies")
        .select("is_private")
        .eq("slug", slug)
        .single();

      if (company?.is_private) {
        const tokenCookie = request.cookies.get(`access_token_${slug}`);
        let hasValidToken = false;

        if (tokenCookie) {
          try {
            const secret = new TextEncoder().encode(
              process.env.JWT_SECRET_KEY!
            );
            await jwtVerify(tokenCookie.value, secret);
            hasValidToken = true;
          } catch (err) {
            // Token inválido, hasValidToken permanece false
          }
        }

        const isOnAuthPage = pathname.endsWith("/auth");

        // REGRA CORRIGIDA:
        // 1. Se o usuário já tem um token válido mas está na página de senha,
        // redireciona para a página de conteúdo.
        if (hasValidToken && isOnAuthPage) {
          return NextResponse.redirect(
            new URL(`/display/${slug}`, request.url)
          );
        }

        // 2. Se o usuário NÃO tem um token válido e NÃO está na página de senha,
        // redireciona para a página de senha.
        if (!hasValidToken && !isOnAuthPage) {
          return NextResponse.redirect(
            new URL(`/display/${slug}/auth`, request.url)
          );
        }
      }
    }
  } catch (error) {
    console.error("Erro no middleware:", error);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
