// src/lib/display/token.ts
import { SignJWT, jwtVerify } from "jose";

const SUBJECT = "company-access";

/** Validade do acesso a um display privado (telas ficam ligadas por longos períodos). */
export const DISPLAY_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function displayTokenCookieName(slug: string): string {
  return `access_token_${slug}`;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret) throw new Error("Missing env.JWT_SECRET_KEY");
  return new TextEncoder().encode(secret);
}

/**
 * `fingerprint` identifica a senha atual da empresa; trocar a senha invalida tokens já emitidos.
 */
export async function createDisplayToken(
  slug: string,
  fingerprint: string
): Promise<string> {
  return new SignJWT({ slug, pv: fingerprint })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${DISPLAY_TOKEN_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyDisplayToken(
  token: string | undefined,
  slug: string,
  fingerprint: string
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      subject: SUBJECT,
    });
    return payload.slug === slug && payload.pv === fingerprint;
  } catch {
    return false;
  }
}
