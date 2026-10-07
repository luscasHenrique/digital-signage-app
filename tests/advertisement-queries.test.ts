import { describe, expect, it } from "vitest";
import { parseAdsSearchParams } from "@/lib/advertisement-queries";

describe("parseAdsSearchParams", () => {
  it("lê busca, situação e página da URL com valores seguros", () => {
    expect(parseAdsSearchParams({ q: "promo", situacao: "live", pagina: "3" })).toEqual({
      q: "promo",
      schedule: "live",
      page: 3,
    });
    expect(parseAdsSearchParams({ situacao: "qualquer", pagina: "-2" })).toEqual({
      q: "",
      schedule: "all",
      page: 1,
    });
    expect(parseAdsSearchParams({ pagina: "abc", q: "x".repeat(300) }).q).toHaveLength(100);
  });
});
