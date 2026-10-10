import { describe, expect, it } from "vitest";
import {
  buildPlayReport,
  formatDuration,
  parseDayParam,
  type PlayReportRow,
} from "@/lib/ads/play-report";

const row = (over: Partial<PlayReportRow>): PlayReportRow => ({
  advertisement_id: "a1",
  company_id: "c1",
  ad_title: "Promo",
  company_name: "Loja",
  ad_deleted: false,
  plays: 1,
  seconds: 10,
  ...over,
});

describe("buildPlayReport", () => {
  it("ordena por exibições e soma os totais", () => {
    const report = buildPlayReport([
      row({ plays: 5, seconds: 50 }),
      row({ advertisement_id: "a2", ad_title: "Outro", plays: 10, seconds: 60 }),
      row({ company_id: "c2", company_name: "Filial", plays: 1, seconds: 10 }),
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

  it("mantém o histórico de anúncio excluído com o título da época", () => {
    const report = buildPlayReport([
      // bigint do Postgres pode chegar como texto
      row({ ad_deleted: true, ad_title: "Black Friday", plays: "7" as unknown as number }),
    ]);
    expect(report.lines[0].adTitle).toBe("Black Friday (excluído)");
    expect(report.totalPlays).toBe(7);
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
