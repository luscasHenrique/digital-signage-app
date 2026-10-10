import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getAuthContext: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ host: "painel.exemplo.com", "x-real-ip": "10.0.0.7" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createActionClient: () => ({
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    rpc: () => {
      throw new Error("sem banco");
    },
  },
}));
vi.mock("@/lib/auth", () => ({ getAuthContext: mocks.getAuthContext }));

import { requestPasswordReset, updateOwnPassword } from "@/actions/account";
import { safeRedirectPath } from "@/lib/auth/site-url";

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("responde igual exista ou não a conta e manda o link para o próprio site", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: "User not found" },
    });

    const a = await requestPasswordReset("Existe@Exemplo.com");
    const b = await requestPasswordReset("nao-existe@exemplo.com");
    expect(a).toEqual(b);
    expect(a.success).toBe(true);

    const [email, options] = mocks.resetPasswordForEmail.mock.calls[0];
    expect(email).toBe("existe@exemplo.com");
    expect(options.redirectTo).toBe(
      "https://painel.exemplo.com/auth/callback?next=%2Fdashboard%2Fconta%3Fnova-senha%3D1"
    );
  });

  it("limita a 5 pedidos por hora por IP", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    // 2 já usados no teste anterior (mesmo IP, limitador em memória)
    for (let i = 0; i < 3; i++) await requestPasswordReset(`x${i}@exemplo.com`);
    const blocked = await requestPasswordReset("y@exemplo.com");
    expect(blocked.success).toBe(false);
    expect(blocked.message).toMatch(/Muitas solicitações/);
  });
});

describe("updateOwnPassword", () => {
  it("valida confirmação antes de chamar o Supabase", async () => {
    const r = await updateOwnPassword({ password: "abcdef", confirm: "abcdeg" });
    expect(r).toEqual({ success: false, message: "As senhas não conferem." });
    expect(mocks.getAuthContext).not.toHaveBeenCalled();
  });

  it("troca a senha da sessão atual", async () => {
    mocks.getAuthContext.mockResolvedValue({
      user: { id: "u1" },
      supabase: { auth: { updateUser: mocks.updateUser } },
    });
    mocks.updateUser.mockResolvedValue({ error: null });
    const r = await updateOwnPassword({ password: "abcdef", confirm: "abcdef" });
    expect(r.success).toBe(true);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "abcdef" });
  });
});

describe("safeRedirectPath", () => {
  it("só aceita caminhos internos", () => {
    expect(safeRedirectPath("/dashboard/conta?x=1")).toBe("/dashboard/conta?x=1");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/%5Cevil.com")).toBe("/%5Cevil.com");
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });
});
