import { describe, expect, it } from "vitest";
import { companySchema, userFormSchema } from "@/lib/schemas";
import { UserRole } from "@/types";

const base = { name: "Empresa X", slug: "empresa-x" };

describe("companySchema", () => {
  it("exige senha ao criar empresa privada", () => {
    expect(companySchema.safeParse({ ...base, is_private: true }).success).toBe(
      false
    );
    expect(
      companySchema.safeParse({ ...base, is_private: true, password: "1234" })
        .success
    ).toBe(true);
  });

  it("permite senha em branco ao editar (mantém a atual)", () => {
    expect(
      companySchema.safeParse({
        ...base,
        id: "1",
        is_private: true,
        password: "",
      }).success
    ).toBe(true);
  });

  it("valida o formato do slug", () => {
    expect(
      companySchema.safeParse({ ...base, slug: "Com Espaço", is_private: false })
        .success
    ).toBe(false);
  });
});

describe("userFormSchema", () => {
  it("valida e-mail, nome e papel", () => {
    expect(
      userFormSchema.safeParse({
        full_name: "Fulano de Tal",
        email: "fulano@x.com",
        password: "",
        role: UserRole.STANDARD,
      }).success
    ).toBe(true);
    expect(
      userFormSchema.safeParse({
        full_name: "  ",
        email: "invalido",
        role: "SUPERADMIN",
      }).success
    ).toBe(false);
  });
});
