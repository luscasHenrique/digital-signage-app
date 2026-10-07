// src/app/api/errors/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth";
import { logError } from "@/lib/errors/log";
import { createPersistentRateLimiter } from "@/lib/security/persistent-rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  source: z.enum(["client", "display"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  url: z.string().max(2000).optional(),
  digest: z.string().max(200).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// Rota pública (as TVs não têm login): limita por IP para não virar spam
const reports = createPersistentRateLimiter({
  limit: 30,
  windowMs: 10 * 60 * 1000,
});

// Erros do navegador (painel e TVs), enviados por reportClientError().
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const attempt = await reports.consume(`error-report:${ip}`);
  if (!attempt.allowed) return new NextResponse(null, { status: 429 });

  // Usuário do painel, se houver sessão (TVs ficam sem)
  const ctx =
    parsed.data.source === "client" ? await getAuthContext().catch(() => null) : null;

  await logError({
    ...parsed.data,
    userAgent: request.headers.get("user-agent"),
    userId: ctx?.user.id ?? null,
  });
  return new NextResponse(null, { status: 204 });
}
