import { describe, expect, it } from "vitest";
import { fitWithin, optimizeImageForUpload, webpFileName } from "@/lib/storage/image-optimize";

describe("fitWithin", () => {
  it("reduz mantendo a proporção só quando passa do limite", () => {
    expect(fitWithin(6000, 4000)).toEqual({ width: 3840, height: 2560 });
    expect(fitWithin(3000, 8000)).toEqual({ width: 1440, height: 3840 });
    expect(fitWithin(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });
});

describe("webpFileName", () => {
  it("troca a extensão", () => {
    expect(webpFileName("foto.final.JPG")).toBe("foto.final.webp");
    expect(webpFileName("sem-extensao")).toBe("sem-extensao.webp");
  });
});

describe("optimizeImageForUpload", () => {
  it("não mexe em GIF (perderia a animação)", async () => {
    const gif = new File(["x"], "a.gif", { type: "image/gif" });
    expect(await optimizeImageForUpload(gif)).toBe(gif);
  });

  it("devolve o original se o navegador não conseguir decodificar", async () => {
    // Ambiente de teste (node) não tem createImageBitmap
    const jpg = new File(["x"], "a.jpg", { type: "image/jpeg" });
    expect(await optimizeImageForUpload(jpg)).toBe(jpg);
  });
});
