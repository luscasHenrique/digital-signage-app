// src/app/api/cron/cleanup-uploads/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { cleanupOrphanUploads } from "@/lib/storage-cleanup";

export const dynamic = "force-dynamic";

// Chamado pela Vercel Cron (vercel.json). A Vercel envia
// `Authorization: Bearer <CRON_SECRET>` quando a variável está definida.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupOrphanUploads();
    console.info("Limpeza de uploads órfãos:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na limpeza de uploads órfãos:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
