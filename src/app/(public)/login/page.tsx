// src/app/(public)/login/page.tsx
import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// A página de Login continua sendo um Server Component.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string };
}) {
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
          {/* Usamos o novo Client Component aqui */}
          <LoginForm message={searchParams.message} />
        </CardContent>
      </Card>
    </main>
  );
}
