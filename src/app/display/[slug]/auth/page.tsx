// src/app/display/[slug]/auth/page.tsx
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PasswordForm } from "@/components/auth/PasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDisplayCompany, hasDisplayAccess } from "@/lib/display";
import { displayTokenCookieName } from "@/lib/display-token";

export const dynamic = "force-dynamic";

interface CompanyAuthPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function CompanyAuthPage({
  params,
}: CompanyAuthPageProps) {
  const { slug } = await params;

  const company = await getDisplayCompany(slug);
  if (!company) notFound();

  // Empresa pública ou acesso já liberado: vai direto para o display.
  const token = (await cookies()).get(displayTokenCookieName(slug))?.value;
  if (!company.is_private || (await hasDisplayAccess(company, token))) {
    redirect(`/display/${slug}`);
  }

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
          <PasswordForm slug={slug} />
        </CardContent>
      </Card>
    </main>
  );
}
