// src/lib/password.ts
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Formato armazenado: scrypt$<salt base64>$<hash base64>
const PREFIX = "scrypt";
const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

export function isPasswordHash(stored: string): boolean {
  return stored.startsWith(`${PREFIX}$`);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${PREFIX}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/**
 * Verifica a senha contra o valor salvo no banco.
 * Aceita senhas legadas em texto puro e sinaliza `needsRehash` para que sejam migradas.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!stored || !password) return { valid: false, needsRehash: false };

  if (!isPasswordHash(stored)) {
    const valid = safeEqual(Buffer.from(password), Buffer.from(stored));
    return { valid, needsRehash: valid };
  }

  const [, saltB64, keyB64] = stored.split("$");
  if (!saltB64 || !keyB64) return { valid: false, needsRehash: false };

  const expected = Buffer.from(keyB64, "base64");
  const actual = await deriveKey(password, Buffer.from(saltB64, "base64"));
  return { valid: safeEqual(actual, expected), needsRehash: false };
}

/** Impressão digital curta da senha salva: muda sempre que a senha muda (invalida tokens antigos). */
export function passwordFingerprint(stored: string | null | undefined): string {
  return createHash("sha256")
    .update(stored ?? "")
    .digest("base64url")
    .slice(0, 16);
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
