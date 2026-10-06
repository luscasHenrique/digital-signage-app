import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/types";
import { fakeClient } from "./helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  adminFrom: vi.fn(),
  cookieSet: vi.fn(),
  ip: "10.0.0.1",
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSet }),
  headers: async () =>
    new Headers({ "x-forwarded-for": mocks.ip }),
}));
vi.mock("@/lib/auth", () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: mocks.adminFrom },
}));

import {
  createCompany,
  updateCompany,
  verifyCompanyPassword,
} from "@/actions/companies";
import { hashPassword, isPasswordHash } from "@/lib/password";

function findCall(
  log: ReturnType<typeof fakeClient>["log"],
  method: string
): unknown[] | undefined {
  for (const entry of log) {
    const call = entry.calls.find(([m]) => m === method);
    if (call) return call[1];
  }
  return undefined;
}

function useUserClient(results: Parameters<typeof fakeClient>[0] = {}) {
  const fake = fakeClient(results);
  mocks.getAuthContext.mockResolvedValue({
    user: { id: "u1" },
    role: UserRole.STANDARD,
    supabase: fake.client,
  });
  return fake;
}

function useAdminClient(results: Parameters<typeof fakeClient>[0] = {}) {
  const fake = fakeClient(results);
  mocks.adminFrom.mockImplementation(fake.client.from);
  return fake;
}

const company = { name: "Empresa X", slug: "empresa-x" };

describe("createCompany / updateCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige login", async () => {
    mocks.getAuthContext.mockResolvedValue(null);
    const result = await createCompany({ ...company, is_private: false });
    expect(result.success).toBe(false);
  });

  it("salva a senha como hash, nunca em texto puro (S2)", async () => {
    const user = useUserClient();
    await createCompany({ ...company, is_private: true, password: "minha-senha" });

    const [inserted] = findCall(user.log, "insert") as [{ password: string }];
    expect(isPasswordHash(inserted.password)).toBe(true);
    expect(inserted.password).not.toContain("minha-senha");
  });

  it("editar empresa privada com senha em branco mantém a senha atual (B1)", async () => {
    const user = useUserClient();
    useAdminClient({ companies: [{ data: { password: "scrypt$a$b" } }] });

    const result = await updateCompany({
      ...company,
      id: "c1",
      is_private: true,
      password: "",
    });

    expect(result.success).toBe(true);
    const [update] = findCall(user.log, "update") as [Record<string, unknown>];
    expect(update).not.toHaveProperty("password");
  });

  it("tornar privada sem senha cadastrada retorna erro no campo senha", async () => {
    const user = useUserClient();
    useAdminClient({ companies: [{ data: { password: "" } }] });

    const result = await updateCompany({
      ...company,
      id: "c1",
      is_private: true,
      password: "",
    });

    expect(result.success).toBe(false);
    expect(result.message).toHaveProperty("password");
    expect(findCall(user.log, "update")).toBeUndefined();
  });

  it("tornar pública limpa a senha", async () => {
    const user = useUserClient();
    await updateCompany({ ...company, id: "c1", is_private: false });

    const [update] = findCall(user.log, "update") as [Record<string, unknown>];
    expect(update.password).toBe("");
  });
});

describe("verifyCompanyPassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("libera acesso com a senha correta e grava cookie httpOnly", async () => {
    mocks.ip = "10.0.0.2";
    useAdminClient({
      companies: [{ data: { id: "c1", password: await hashPassword("certa") } }],
    });

    const result = await verifyCompanyPassword({
      slug: "empresa-x",
      password: "certa",
    });

    expect(result.success).toBe(true);
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "access_token_empresa-x",
      expect.any(String),
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("migra senha legada em texto puro para hash", async () => {
    mocks.ip = "10.0.0.3";
    const admin = useAdminClient({
      companies: [{ data: { id: "c1", password: "legada" } }, {}],
    });

    const result = await verifyCompanyPassword({
      slug: "empresa-x",
      password: "legada",
    });

    expect(result.success).toBe(true);
    const [update] = findCall(admin.log, "update") as [{ password: string }];
    expect(isPasswordHash(update.password)).toBe(true);
  });

  it("bloqueia após 5 tentativas erradas do mesmo IP (S5)", async () => {
    mocks.ip = "10.0.0.4";
    const hash = await hashPassword("certa");
    mocks.adminFrom.mockImplementation(
      () => fakeClient({ companies: [{ data: { id: "c1", password: hash } }] }).client.from("companies")
    );

    for (let i = 0; i < 5; i++) {
      const r = await verifyCompanyPassword({ slug: "empresa-x", password: "errada" });
      expect(r.message).toBe("Senha incorreta.");
    }

    const blocked = await verifyCompanyPassword({
      slug: "empresa-x",
      password: "certa",
    });
    expect(blocked.success).toBe(false);
    expect(blocked.message).toMatch(/Muitas tentativas/);
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
