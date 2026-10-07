import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createDisplayToken, verifyDisplayToken } from "@/lib/display/token";

describe("display token", () => {
  it("vale para a empresa e a senha para as quais foi emitido", async () => {
    const token = await createDisplayToken("empresa-a", "fp1");
    expect(await verifyDisplayToken(token, "empresa-a", "fp1")).toBe(true);
  });

  it("não vale para outra empresa (S4)", async () => {
    const token = await createDisplayToken("empresa-a", "fp1");
    expect(await verifyDisplayToken(token, "empresa-b", "fp1")).toBe(false);
  });

  it("deixa de valer quando a senha da empresa muda", async () => {
    const token = await createDisplayToken("empresa-a", "fp1");
    expect(await verifyDisplayToken(token, "empresa-a", "fp2")).toBe(false);
  });

  it("rejeita token ausente, adulterado ou assinado com outro segredo", async () => {
    const token = await createDisplayToken("empresa-a", "fp1");
    expect(await verifyDisplayToken(undefined, "empresa-a", "fp1")).toBe(false);
    expect(await verifyDisplayToken(token + "x", "empresa-a", "fp1")).toBe(
      false
    );

    const forged = await new SignJWT({ slug: "empresa-a", pv: "fp1" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("company-access")
      .sign(new TextEncoder().encode("outro-segredo"));
    expect(await verifyDisplayToken(forged, "empresa-a", "fp1")).toBe(false);
  });

  it("rejeita token sem o subject esperado", async () => {
    const other = await new SignJWT({ slug: "empresa-a", pv: "fp1" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("outra-coisa")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET_KEY!));
    expect(await verifyDisplayToken(other, "empresa-a", "fp1")).toBe(false);
  });
});
