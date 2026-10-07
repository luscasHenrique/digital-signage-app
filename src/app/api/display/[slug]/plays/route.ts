// src/app/api/display/[slug]/plays/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDisplayCompany, hasDisplayAccess } from "@/lib/display/data";
import { displayTokenCookieName } from "@/lib/display/token";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        ad_id: z.string().uuid(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        plays: z.number().int().min(1).max(10000),
      })
    )
    .min(1)
    .max(500),
});

// O player envia quantas vezes cada anúncio passou (somado no banco por dia).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const company = await getDisplayCompany(slug);
    if (!company) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const token = request.cookies.get(displayTokenCookieName(slug))?.value;
    if (!(await hasDisplayAccess(company, token))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin.rpc("record_ad_plays", {
      p_company_id: company.id,
      p_items: parsed.data.items,
    });
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao registrar exibições:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
