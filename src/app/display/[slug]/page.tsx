// src/app/display/[slug]/page.tsx
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CompanyDisplay } from "@/components/display/CompanyDisplay";
import { DisplayError } from "@/components/display/DisplayError";
import {
  getActiveAdsForCompany,
  getDisplayCompany,
  hasDisplayAccess,
} from "@/lib/display";
import { displayTokenCookieName } from "@/lib/display-token";

export const revalidate = 0; // sem cache
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
    ads = await getActiveAdsForCompany(company.id);
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
      animationType="slideFromRight"
    />
  );
}
