import { PasswordForm } from "@/components/auth/PasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// A tipagem da prop 'params' agora reflete que é uma Promise
interface CompanyAuthPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// A página precisa ser 'async' para usar o 'await'
export default async function CompanyAuthPage({
  params,
}: CompanyAuthPageProps) {
  // CORREÇÃO: Usamos 'await' para resolver a Promise
  const resolvedParams = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
          <CardDescription>
            Por favor, insira a senha para visualizar esta página de anúncios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Passamos o slug resolvido para o formulário */}
          <PasswordForm slug={resolvedParams.slug} />
        </CardContent>
      </Card>
    </main>
  );
}
