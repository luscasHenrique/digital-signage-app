import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { rpc: mocks.rpc },
}));

import { createPersistentRateLimiter } from "@/lib/persistent-rate-limit";

const rpcResult = (result: { data?: unknown; error?: unknown }) => ({
  single: () => Promise.resolve({ data: null, error: null, ...result }),
});

describe("createPersistentRateLimiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("usa a função do banco com a janela em segundos", async () => {
    mocks.rpc.mockReturnValue(
      rpcResult({ data: { allowed: false, retry_after_seconds: 90 } })
    );
    const limiter = createPersistentRateLimiter({
      limit: 5,
      windowMs: 900_000,
    });

    expect(await limiter.consume("k")).toEqual({
      allowed: false,
      retryAfterMs: 90_000,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_key: "k",
      p_limit: 5,
      p_window_seconds: 900,
    });
  });

  it("cai para a memória se o banco falhar, sem liberar tentativas ilimitadas", async () => {
    mocks.rpc.mockReturnValue(rpcResult({ error: { message: "sem função" } }));
    const limiter = createPersistentRateLimiter({ limit: 2, windowMs: 60_000 });

    expect((await limiter.consume("k")).allowed).toBe(true);
    expect((await limiter.consume("k")).allowed).toBe(true);
    expect((await limiter.consume("k")).allowed).toBe(false);
  });

  it("reset limpa a memória e chama a função do banco", async () => {
    mocks.rpc.mockReturnValue(rpcResult({ error: { message: "x" } }));
    const limiter = createPersistentRateLimiter({ limit: 1, windowMs: 60_000 });
    await limiter.consume("k");
    expect((await limiter.consume("k")).allowed).toBe(false);

    await limiter.reset("k");
    expect(mocks.rpc).toHaveBeenCalledWith("reset_rate_limit", { p_key: "k" });
    expect((await limiter.consume("k")).allowed).toBe(true);
  });
});
