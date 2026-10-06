import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isPasswordHash,
  passwordFingerprint,
  verifyPassword,
} from "@/lib/password";

describe("password", () => {
  it("gera hash que não contém a senha e valida corretamente", async () => {
    const hash = await hashPassword("segredo123");
    expect(isPasswordHash(hash)).toBe(true);
    expect(hash).not.toContain("segredo123");

    expect(await verifyPassword("segredo123", hash)).toEqual({
      valid: true,
      needsRehash: false,
    });
    expect((await verifyPassword("errada", hash)).valid).toBe(false);
  });

  it("usa salt aleatório (hashes diferentes para a mesma senha)", async () => {
    expect(await hashPassword("abc")).not.toBe(await hashPassword("abc"));
  });

  it("aceita senha legada em texto puro e pede migração", async () => {
    expect(await verifyPassword("antiga", "antiga")).toEqual({
      valid: true,
      needsRehash: true,
    });
    expect(await verifyPassword("outra", "antiga")).toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it("rejeita senha vazia ou sem senha cadastrada", async () => {
    expect((await verifyPassword("", "")).valid).toBe(false);
    expect((await verifyPassword("x", null)).valid).toBe(false);
    expect((await verifyPassword("x", "scrypt$abc")).valid).toBe(false);
  });

  it("impressão digital muda quando a senha muda", async () => {
    const a = await hashPassword("um");
    const b = await hashPassword("dois");
    expect(passwordFingerprint(a)).toBe(passwordFingerprint(a));
    expect(passwordFingerprint(a)).not.toBe(passwordFingerprint(b));
  });
});
