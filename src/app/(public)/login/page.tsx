// src/app/(public)/login/page.tsx

import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// A função da página precisa ser async para usar await
export default async function LoginPage({
  searchParams,
}: {
  // A prop é uma Promise que resolve para um objeto com a mensagem
  searchParams: Promise<{ message?: string }>;
}) {
  // CORREÇÃO FINAL: Usamos 'await' para extrair o objeto da Promise
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams?.message || "";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Digite seu e-mail e senha para acessar o painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Passamos a mensagem já resolvida */}
          <LoginForm message={message} />
        </CardContent>
      </Card>
    </main>
  );
}
