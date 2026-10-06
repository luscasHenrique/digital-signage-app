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

import { createUser, deleteUser, updateUser } from "@/actions/users";
import { fakeQuery } from "./helpers/fake-supabase";

const newUser = {
  full_name: "Invasor",
  email: "invasor@x.com",
  password: "123456",
  role: UserRole.ADMIN,
};

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

    expect(created.success).toBe(false);
    expect(updated.success).toBe(false);
    expect(deleted.success).toBe(false);
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
});
