// src/app/api/display/[slug]/route.ts
import { createHash } from "node:crypto";
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
    const body = JSON.stringify({ ads });
    // O player consulta a cada 30 s; se nada mudou, responde 304 sem corpo.
    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
    const headers = { "Cache-Control": "no-store", ETag: etag };

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers });
    }
    return new NextResponse(body, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao carregar anúncios do display:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
