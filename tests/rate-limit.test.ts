import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("rate limiter", () => {
  it("bloqueia após o limite e libera quando a janela expira", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    const t0 = 1_000_000;

    expect(limiter.consume("ip:a", t0).allowed).toBe(true);
    expect(limiter.consume("ip:a", t0).allowed).toBe(true);
    expect(limiter.consume("ip:a", t0).allowed).toBe(true);
    const blocked = limiter.consume("ip:a", t0 + 100);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(900);

    expect(limiter.consume("ip:b", t0).allowed).toBe(true);
    expect(limiter.consume("ip:a", t0 + 1000).allowed).toBe(true);
  });

  it("reset limpa as tentativas da chave", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.consume("k", 0);
    expect(limiter.consume("k", 1).allowed).toBe(false);
    limiter.reset("k");
    expect(limiter.consume("k", 2).allowed).toBe(true);
  });
});
