// src/app/display/[slug]/auth/page.tsx
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PasswordForm } from "@/components/auth/PasswordForm";
import styles from "@/components/auth/auth.module.css";
import { getDisplayCompany, hasDisplayAccess } from "@/lib/display";
import { displayTokenCookieName } from "@/lib/display-token";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const company = await getDisplayCompany((await params).slug).catch(() => null);
  return {
    title: company ? `${company.name} · Acesso` : "Tela",
    robots: { index: false, follow: false },
  };
}

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
    <main className={styles.page}>
      <div className={styles.stack}>
        <PasswordForm slug={slug} />
      </div>
    </main>
  );
}
