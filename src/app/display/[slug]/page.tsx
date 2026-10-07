// src/app/display/[slug]/page.tsx
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CompanyDisplay } from "@/components/display/CompanyDisplay";
import { DisplayError } from "@/components/display/DisplayError";
import {
  getActiveAdsForCompany,
  getDisplayCompany,
  hasDisplayAccess,
  recordDisplayHeartbeat,
} from "@/lib/display/data";
import { displayTokenCookieName } from "@/lib/display/token";

export const revalidate = 0; // sem cache
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const company = await getDisplayCompany((await params).slug).catch(() => null);
  return {
    title: company ? `${company.name}` : "Tela",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic"; // SSR dinâmico

interface DisplayPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { slug } = await params;

  const company = await getDisplayCompany(slug);
  if (!company) notFound();

  const token = (await cookies()).get(displayTokenCookieName(slug))?.value;
  if (!(await hasDisplayAccess(company, token))) {
    redirect(`/display/${slug}/auth`);
  }

  let ads;
  try {
    [ads] = await Promise.all([
      getActiveAdsForCompany(company.id),
      recordDisplayHeartbeat(
        company.id,
        (await headers()).get("user-agent")
      ),
    ]);
  } catch (error) {
    console.error("Erro ao buscar anúncios:", error);
    return <DisplayError />;
  }

  // O player continua rodando mesmo sem anúncios, para exibir os que forem ativados depois.
  return (
    <CompanyDisplay
      ads={ads}
      companyId={company.id}
      slug={company.slug}
      animationType={company.transition}
    />
  );
}
