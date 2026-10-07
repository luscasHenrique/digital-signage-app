import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "10.0.0.9" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createActionClient: () => ({
    auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut },
  }),
}));
// Sem banco: o limitador cai para a memória
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { rpc: mocks.rpc },
}));

import { login, logout } from "@/actions/auth";

function form(email: string, password = "x") {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.rpc.mockImplementation(() => {
      throw new Error("sem banco");
    });
  });

  it("bloqueia depois de 10 tentativas erradas para o mesmo e-mail", async () => {
    mocks.signIn.mockResolvedValue({ error: { message: "invalid" } });

    for (let i = 0; i < 10; i++) {
      const r = await login(form("Alvo@Exemplo.com"));
      expect(r.message).toBe("Credenciais inválidas. Tente novamente.");
    }
    // Maiúsculas/espaços não contornam o limite
    const blocked = await login(form("  alvo@exemplo.com "));
    expect(blocked.success).toBe(false);
    expect(blocked.message).toMatch(/Muitas tentativas/);
    expect(mocks.signIn).toHaveBeenCalledTimes(10);

    // Outro e-mail continua liberado
    await login(form("outro@exemplo.com"));
    expect(mocks.signIn).toHaveBeenCalledTimes(11);
  });

  it("zera o contador quando o login dá certo", async () => {
    mocks.signIn.mockResolvedValue({ error: { message: "invalid" } });
    for (let i = 0; i < 9; i++) await login(form("ok@exemplo.com"));

    mocks.signIn.mockResolvedValueOnce({ error: null });
    expect((await login(form("ok@exemplo.com"))).success).toBe(true);

    for (let i = 0; i < 10; i++) {
      expect((await login(form("ok@exemplo.com"))).message).not.toMatch(
        /Muitas tentativas/
      );
    }
  });
});

describe("logout", () => {
  it("não expõe o erro técnico ao usuário", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.signOut.mockResolvedValue({ error: new Error("JWT expired xyz") });
    const r = await logout();
    expect(r.success).toBe(false);
    expect(r.message).not.toContain("JWT");
  });
});
