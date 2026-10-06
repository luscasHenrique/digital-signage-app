// src/app/api/display/[slug]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  getActiveAdsForCompany,
  getDisplayCompany,
  hasDisplayAccess,
} from "@/lib/display";
import { displayTokenCookieName } from "@/lib/display-token";

export const dynamic = "force-dynamic";

// Usado pelo player (CompanyDisplay) para recarregar os anúncios.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const company = await getDisplayCompany(slug);
    if (!company) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const token = request.cookies.get(displayTokenCookieName(slug))?.value;
    if (!(await hasDisplayAccess(company, token))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const ads = await getActiveAdsForCompany(company.id);
    return NextResponse.json(
      { ads },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erro ao carregar anúncios do display:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
