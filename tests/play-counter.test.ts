import { describe, expect, it } from "vitest";
import {
  MAX_PAYLOAD_ITEMS,
  addPlay,
  dropExpired,
  nextBatch,
  playDay,
  subtractSent,
  toPayload,
} from "@/components/display/play-counter";

describe("play-counter", () => {
  it("agrupa pelo dia de Brasília", () => {
    // 01:00Z de 8/10 ainda é 7/10 em Brasília
    expect(playDay(new Date("2026-10-08T01:00:00Z"))).toBe("2026-10-07");
    expect(playDay(new Date("2026-10-08T04:00:00Z"))).toBe("2026-10-08");
  });

  it("soma por dia e anúncio e monta o envio", () => {
    const now = new Date("2026-10-07T15:00:00Z");
    let counts = addPlay({}, "a", now);
    counts = addPlay(counts, "a", now);
    counts = addPlay(counts, "b", now);
    expect(toPayload(counts)).toEqual([
      { day: "2026-10-07", ad_id: "a", plays: 2 },
      { day: "2026-10-07", ad_id: "b", plays: 1 },
    ]);
  });

  it("depois do envio, mantém só o que entrou no meio", () => {
    const sent = { "2026-10-07|a": 2, "2026-10-07|b": 1 };
    const current = { "2026-10-07|a": 3, "2026-10-07|b": 1 };
    expect(subtractSent(current, sent)).toEqual({ "2026-10-07|a": 1 });
  });

  it("envia em lotes do tamanho aceito pela API", () => {
    const counts = Object.fromEntries(
      Array.from({ length: MAX_PAYLOAD_ITEMS + 20 }, (_, i) => [`2026-10-07|ad${i}`, 1])
    );
    const { items, sent } = nextBatch(counts);
    expect(items).toHaveLength(MAX_PAYLOAD_ITEMS);
    expect(Object.keys(subtractSent(counts, sent))).toHaveLength(20);
  });

  it("descarta dias que o servidor não aceita mais", () => {
    const now = new Date("2026-10-31T15:00:00Z");
    const counts = { "2026-09-01|a": 5, "2026-10-20|a": 2 };
    expect(dropExpired(counts, now)).toEqual({ "2026-10-20|a": 2 });
  });
});
