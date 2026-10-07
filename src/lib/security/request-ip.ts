// src/lib/security/request-ip.ts
import "server-only";

import { headers } from "next/headers";

/** IP do cliente. Na Vercel, x-real-ip / x-forwarded-for vêm da própria plataforma. */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-real-ip") ||
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
