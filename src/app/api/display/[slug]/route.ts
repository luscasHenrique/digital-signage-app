// src/app/api/display/[slug]/route.ts
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  displaySettings,
  getActiveAdsForCompany,
  getDisplayCompany,
  hasDisplayAccess,
  recordDisplayHeartbeat,
} from "@/lib/display/data";
import { displayTokenCookieName } from "@/lib/display/token";
import { logError } from "@/lib/errors/log";

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

    const [ads] = await Promise.all([
      getActiveAdsForCompany(company.id),
      recordDisplayHeartbeat(company.id, request.headers.get("user-agent")),
    ]);
    const body = JSON.stringify({ ads, settings: displaySettings(company) });
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
    await logError({
      source: "server",
      message: `API do display (${slug}): ${errorText(error)}`,
      stack: error instanceof Error ? error.stack : null,
      url: `GET /api/display/${slug}`,
    });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
