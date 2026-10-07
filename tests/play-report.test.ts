import { describe, expect, it } from "vitest";
import {
  aggregatePlays,
  formatDuration,
  parseDayParam,
  type PlayStatRow,
} from "@/lib/play-report";

const row = (over: Partial<PlayStatRow>): PlayStatRow => ({
  day: "2026-10-07",
  plays: 1,
  advertisement_id: "a1",
  company_id: "c1",
  advertisement: { title: "Promo", duration_seconds: 10 },
  company: { name: "Loja" },
  ...over,
});

describe("aggregatePlays", () => {
  it("soma por anúncio + empresa, ordena por exibições e calcula o tempo", () => {
    const report = aggregatePlays([
      row({ plays: 3 }),
      row({ day: "2026-10-06", plays: 2 }),
      row({ advertisement_id: "a2", plays: 10, advertisement: { title: "Outro", duration_seconds: 6 } }),
      row({ company_id: "c2", company: { name: "Filial" }, plays: 1 }),
    ]);
    expect(report.lines.map((l) => [l.adTitle, l.companyName, l.plays, l.seconds])).toEqual([
      ["Outro", "Loja", 10, 60],
      ["Promo", "Loja", 5, 50],
      ["Promo", "Filial", 1, 10],
    ]);
    expect(report.totalPlays).toBe(16);
    expect(report.totalSeconds).toBe(120);
    expect(report.ads).toBe(2);
  });
});

describe("formatDuration / parseDayParam", () => {
  it("formata a duração", () => {
    expect(formatDuration(20)).toBe("20 s");
    expect(formatDuration(90)).toBe("2 min");
    expect(formatDuration(5400)).toBe("1 h 30 min");
    expect(formatDuration(7200)).toBe("2 h");
  });

  it("aceita só datas válidas", () => {
    expect(parseDayParam("2026-10-07", "x")).toBe("2026-10-07");
    expect(parseDayParam("07/10/2026", "x")).toBe("x");
    expect(parseDayParam(undefined, "x")).toBe("x");
  });
});
