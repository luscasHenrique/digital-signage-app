// src/app/api/cron/cleanup-uploads/route.ts
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { purgeOldErrorLogs } from "@/lib/errors/log";
import { cleanupOrphanUploads } from "@/lib/storage/cleanup";

export const dynamic = "force-dynamic";

// Chamado pela Vercel Cron (vercel.json). A Vercel envia
// `Authorization: Bearer <CRON_SECRET>` quando a variável está definida.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get("authorization"), `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Cada tarefa roda mesmo se a outra falhar
  const [uploads, errorLogs] = await Promise.allSettled([
    cleanupOrphanUploads(),
    // Aproveita a rotina diária para limpar erros antigos (30 dias)
    purgeOldErrorLogs(),
  ]);
  if (uploads.status === "rejected") {
    console.error("Erro na limpeza de uploads órfãos:", uploads.reason);
  }
  if (errorLogs.status === "rejected") {
    console.error("Erro na limpeza de erros antigos:", errorLogs.reason);
  }

  const result = {
    ...(uploads.status === "fulfilled" ? uploads.value : { uploadsError: true }),
    errorLogsRemoved: errorLogs.status === "fulfilled" ? errorLogs.value : null,
  };
  console.info("Limpeza diária:", result);
  const failed = uploads.status === "rejected" || errorLogs.status === "rejected";
  return NextResponse.json(result, { status: failed ? 500 : 200 });
}

/** Comparação em tempo constante (o tempo de resposta não revela o segredo). */
function sameSecret(received: string | null, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received ?? ""), digest(expected));
}
