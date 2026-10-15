import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/types";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  createUser: vi.fn(),
  updateUserById: vi.fn(),
  deleteUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
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
    rpc: mocks.rpc,
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

const MY_ID = "00000000-0000-4000-8000-000000000000";
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
    expect(mocks.rpc).not.toHaveBeenCalled();
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
    loggedAs(UserRole.ADMIN, MY_ID);

    expect((await deleteUser(MY_ID)).success).toBe(false);
    expect(
      (await updateUser({ ...newUser, id: MY_ID, role: UserRole.STANDARD }))
        .success
    ).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  describe("exclusão (função delete_user_and_reassign_ads)", () => {
    beforeEach(() => {
      loggedAs(UserRole.ADMIN, MY_ID);
      mocks.rpc.mockResolvedValue({ data: 0, error: null });
    });

    it("sem destino, os anúncios ficam sem autor", async () => {
      expect((await deleteUser(OTHER_ID, null)).success).toBe(true);
      expect(mocks.rpc).toHaveBeenCalledWith("delete_user_and_reassign_ads", {
        p_user_id: OTHER_ID,
        p_actor_id: MY_ID,
        p_transfer_to: undefined,
      });
      expect(mocks.deleteUser).not.toHaveBeenCalled();
    });

    it("com destino, transfere na mesma chamada", async () => {
      mocks.rpc.mockResolvedValue({ data: 3, error: null });

      expect((await deleteUser(OTHER_ID, TARGET_ID)).success).toBe(true);
      expect(mocks.rpc).toHaveBeenCalledWith("delete_user_and_reassign_ads", {
        p_user_id: OTHER_ID,
        p_actor_id: MY_ID,
        p_transfer_to: TARGET_ID,
      });
    });

    it("recusa IDs inválidos ou o próprio usuário como destino", async () => {
      expect((await deleteUser("nao-e-uuid")).success).toBe(false);
      expect((await deleteUser(OTHER_ID, "nao-e-uuid")).success).toBe(false);
      expect((await deleteUser(OTHER_ID, OTHER_ID)).success).toBe(false);
      expect(mocks.rpc).not.toHaveBeenCalled();
    });

    it("mostra o erro do banco (nada é alterado)", async () => {
      mocks.rpc.mockResolvedValue({
        data: null,
        error: { message: "Usuário de destino não encontrado." },
      });

      expect(await deleteUser(OTHER_ID, TARGET_ID)).toEqual({
        success: false,
        message: "Falha ao excluir o usuário: Usuário de destino não encontrado.",
      });
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
