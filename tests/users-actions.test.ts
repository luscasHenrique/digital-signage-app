import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/types";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: mocks.createUser,
        updateUserById: mocks.updateUserById,
        deleteUser: mocks.deleteUser,
      },
    },
    from: mocks.from,
  },
}));

import {
  countUserAdvertisements,
  createUser,
  deleteUser,
  updateUser,
} from "@/actions/users";
import { fakeQuery } from "./helpers/fake-supabase";

const newUser = {
  full_name: "Invasor",
  email: "invasor@x.com",
  password: "123456",
  role: UserRole.ADMIN,
};

const OTHER_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_ID = "22222222-2222-4222-8222-222222222222";

function loggedAs(role: UserRole, id = "me") {
  mocks.getAuthContext.mockResolvedValue({ user: { id }, role });
}

describe("actions de usuários (S1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockImplementation(() => fakeQuery().query);
  });

  it.each([
    ["sem login", null],
    ["usuário STANDARD", UserRole.STANDARD],
  ])("bloqueia %s em todas as operações", async (_label, role) => {
    if (role) loggedAs(role);
    else mocks.getAuthContext.mockResolvedValue(null);

    const created = await createUser(newUser);
    const updated = await updateUser({ ...newUser, id: "outro" });
    const deleted = await deleteUser("outro");
    const counted = await countUserAdvertisements(OTHER_ID);

    expect(created.success).toBe(false);
    expect(updated.success).toBe(false);
    expect(deleted.success).toBe(false);
    expect(counted).toBeNull();
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("permite ADMIN criar usuário", async () => {
    loggedAs(UserRole.ADMIN);
    mocks.createUser.mockResolvedValue({
      data: { user: { id: "novo" } },
      error: null,
    });

    const result = await createUser(newUser);

    expect(result).toEqual({
      success: true,
      message: "Usuário criado com sucesso!",
    });
    expect(mocks.createUser).toHaveBeenCalledOnce();
  });

  it("impede ADMIN de excluir a si mesmo ou remover o próprio papel", async () => {
    loggedAs(UserRole.ADMIN, "me");

    expect((await deleteUser("me")).success).toBe(false);
    expect(
      (await updateUser({ ...newUser, id: "me", role: UserRole.STANDARD }))
        .success
    ).toBe(false);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("permite ADMIN excluir outro usuário", async () => {
    loggedAs(UserRole.ADMIN, "me");
    mocks.deleteUser.mockResolvedValue({
      data: { user: { id: "outro" } },
      error: null,
    });

    expect((await deleteUser("outro")).success).toBe(true);
    expect(mocks.deleteUser).toHaveBeenCalledWith("outro");
  });

  describe("anúncios do usuário excluído", () => {
    beforeEach(() => {
      loggedAs(UserRole.ADMIN, "me");
      mocks.deleteUser.mockResolvedValue({
        data: { user: { id: OTHER_ID } },
        error: null,
      });
    });

    it("sem destino, só exclui (anúncios ficam sem autor pela FK)", async () => {
      expect((await deleteUser(OTHER_ID, null)).success).toBe(true);
      expect(mocks.from).not.toHaveBeenCalled();
      expect(mocks.deleteUser).toHaveBeenCalledWith(OTHER_ID);
    });

    it("transfere os anúncios antes de excluir", async () => {
      const profile = fakeQuery({ data: { id: TARGET_ID } });
      const ads = fakeQuery();
      mocks.from.mockImplementation((table: string) =>
        table === "profiles" ? profile.query : ads.query
      );

      expect((await deleteUser(OTHER_ID, TARGET_ID)).success).toBe(true);
      expect(ads.calls).toEqual([
        ["update", [{ created_by: TARGET_ID }]],
        ["eq", ["created_by", OTHER_ID]],
      ]);
      expect(mocks.deleteUser).toHaveBeenCalledWith(OTHER_ID);
    });

    it("recusa destino inválido, inexistente ou o próprio usuário", async () => {
      expect((await deleteUser(OTHER_ID, "nao-e-uuid")).success).toBe(false);
      expect((await deleteUser(OTHER_ID, OTHER_ID)).success).toBe(false);
      // fakeQuery padrão: perfil de destino não encontrado
      expect((await deleteUser(OTHER_ID, TARGET_ID)).success).toBe(false);
      expect(mocks.deleteUser).not.toHaveBeenCalled();
    });

    it("não exclui se a transferência falhar", async () => {
      const profile = fakeQuery({ data: { id: TARGET_ID } });
      const ads = fakeQuery({ error: new Error("falhou") });
      mocks.from.mockImplementation((table: string) =>
        table === "profiles" ? profile.query : ads.query
      );

      expect((await deleteUser(OTHER_ID, TARGET_ID)).success).toBe(false);
      expect(mocks.deleteUser).not.toHaveBeenCalled();
    });

    it("conta os anúncios criados pelo usuário", async () => {
      // fakeQuery não devolve `count`, então a consulta é montada à mão
      const eq = vi.fn().mockResolvedValue({ count: 3, error: null });
      const select = vi.fn().mockReturnValue({ eq });
      mocks.from.mockReturnValue({ select });

      expect(await countUserAdvertisements(OTHER_ID)).toBe(3);
      expect(eq).toHaveBeenCalledWith("created_by", OTHER_ID);
      expect(await countUserAdvertisements("nao-e-uuid")).toBeNull();
    });
  });
});
