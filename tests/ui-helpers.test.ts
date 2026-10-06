import { describe, expect, it } from "vitest";
import { findActiveMenuId, menuData } from "@/config/menuData";
import { formatPeriod } from "@/lib/format";
import { normalizeSearch } from "@/lib/search";

describe("findActiveMenuId", () => {
  it("escolhe o item mais específico para a rota", () => {
    expect(findActiveMenuId(menuData, "/dashboard")).toBe("dashboard");
    expect(findActiveMenuId(menuData, "/dashboard/anuncios")).toBe("anuncios");
    expect(findActiveMenuId(menuData, "/dashboard/empresas/123/anuncios")).toBe(
      "empresas"
    );
    expect(findActiveMenuId(menuData, "/dashboard/admin/auditoria")).toBe(
      "auditoria"
    );
  });

  it("não confunde prefixos parecidos", () => {
    expect(findActiveMenuId(menuData, "/dashboard/anunciosx")).toBe(
      "dashboard"
    );
    expect(findActiveMenuId(menuData, "/login")).toBeUndefined();
  });
});

describe("normalizeSearch", () => {
  it("ignora acentos, caixa e espaços nas pontas", () => {
    expect(normalizeSearch("  Promoção de VERÃO ")).toBe("promocao de verao");
  });
});

describe("formatPeriod", () => {
  it("mostra o intervalo ou só uma data quando é o mesmo dia", () => {
    expect(
      formatPeriod(new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 59))
    ).toBe("01/10/2026 – 31/10/2026");
    expect(
      formatPeriod(new Date(2026, 9, 1), new Date(2026, 9, 1, 23, 59))
    ).toBe("01/10/2026");
  });
});
