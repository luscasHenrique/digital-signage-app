import { describe, expect, it } from "vitest";
import { diffCompanyLinks } from "@/lib/advertisement-links";

describe("diffCompanyLinks", () => {
  it("calcula inclusões e remoções", () => {
    expect(diffCompanyLinks(["a", "b"], ["b", "c"])).toEqual({
      toAdd: ["c"],
      toRemove: ["a"],
    });
  });

  it("não faz nada quando não há mudança, e ignora duplicados", () => {
    expect(diffCompanyLinks(["a", "b"], ["b", "a", "a"])).toEqual({
      toAdd: [],
      toRemove: [],
    });
  });
});
