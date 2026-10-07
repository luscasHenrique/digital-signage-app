import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));

import { hasDisplayAccess, type DisplayCompany } from "@/lib/display/data";
import { createDisplayToken } from "@/lib/display/token";
import { hashPassword, passwordFingerprint } from "@/lib/security/password";

async function privateCompany(slug: string, password: string) {
  return {
    id: slug,
    name: slug,
    slug,
    is_private: true,
    password: await hashPassword(password),
    transition: "fade",
  } satisfies DisplayCompany;
}

describe("hasDisplayAccess", () => {
  it("empresa pública não exige token", async () => {
    const company: DisplayCompany = {
      id: "1",
      name: "Pública",
      slug: "publica",
      is_private: false,
      transition: "fade",
      password: "",
    };
    expect(await hasDisplayAccess(company, undefined)).toBe(true);
  });

  it("empresa privada exige token válido da própria empresa", async () => {
    const a = await privateCompany("empresa-a", "senha-a");
    const b = await privateCompany("empresa-b", "senha-b");
    const tokenA = await createDisplayToken(
      a.slug,
      passwordFingerprint(a.password)
    );

    expect(await hasDisplayAccess(a, undefined)).toBe(false);
    expect(await hasDisplayAccess(a, tokenA)).toBe(true);
    // Token da empresa A copiado para a empresa B não funciona (S4)
    expect(await hasDisplayAccess(b, tokenA)).toBe(false);
  });

  it("trocar a senha invalida tokens emitidos antes", async () => {
    const a = await privateCompany("empresa-a", "senha-antiga");
    const token = await createDisplayToken(
      a.slug,
      passwordFingerprint(a.password)
    );

    const changed = { ...a, password: await hashPassword("senha-nova") };
    expect(await hasDisplayAccess(changed, token)).toBe(false);
  });
});
