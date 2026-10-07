import { describe, expect, it } from "vitest";
import {
  endOfDay,
  getAdSchedule,
  getYoutubeEmbedUrl,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
  startOfDay,
} from "@/lib/advertisement-display";
import { AdvertisementStatus } from "@/types";

describe("YouTube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123", "abc123"],
    ["https://youtube.com/watch?v=abc123&t=10", "abc123"],
    ["https://m.youtube.com/watch?v=abc123", "abc123"],
    ["https://youtu.be/abc123", "abc123"],
    ["https://www.youtube.com/embed/abc123", "abc123"],
    ["https://www.youtube.com/shorts/abc123", "abc123"],
  ])("extrai o id de %s", (url, id) => {
    expect(getYoutubeVideoId(url)).toBe(id);
  });

  it("retorna null para links que não são do YouTube", () => {
    expect(getYoutubeVideoId("https://vimeo.com/123")).toBeNull();
    expect(getYoutubeVideoId("não é url")).toBeNull();
    expect(getYoutubeVideoId(undefined)).toBeNull();
  });

  it("monta URLs de capa e de embed em loop sem som", () => {
    expect(getYoutubeThumbnailUrl("https://youtu.be/abc")).toBe(
      "https://i.ytimg.com/vi/abc/hqdefault.jpg"
    );
    const embed = getYoutubeEmbedUrl("https://youtu.be/abc")!;
    expect(embed).toContain("/embed/abc");
    expect(embed).toContain("mute=1");
    expect(embed).toContain("loop=1&playlist=abc");
  });
});

describe("getAdSchedule", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const ad = (status: AdvertisementStatus, start: string, end: string) => ({
    status,
    start_date: start,
    end_date: end,
  });

  it("classifica pelo status e pelo período", () => {
    const A = AdvertisementStatus.ACTIVE;
    expect(getAdSchedule(ad(A, "2026-10-01", "2026-10-31"), now)).toBe("live");
    expect(getAdSchedule(ad(A, "2026-10-10", "2026-10-31"), now)).toBe(
      "scheduled"
    );
    expect(getAdSchedule(ad(A, "2026-09-01", "2026-10-01"), now)).toBe(
      "expired"
    );
    expect(
      getAdSchedule(
        ad(AdvertisementStatus.INACTIVE, "2026-10-01", "2026-10-31"),
        now
      )
    ).toBe("inactive");
  });
});

describe("startOfDay / endOfDay", () => {
  it("cobrem o dia inteiro no horário local", () => {
    const d = new Date(2026, 9, 6, 15, 30);
    expect(startOfDay(d)).toEqual(new Date(2026, 9, 6, 0, 0, 0, 0));
    expect(endOfDay(d)).toEqual(new Date(2026, 9, 6, 23, 59, 59, 999));
    // não altera a data original
    expect(d.getHours()).toBe(15);
  });
});

describe("getAdSchedule com dias/horários", () => {
  it("fica 'fora do horário' quando o dia não está na programação", () => {
    // 2026-10-06 12:00Z = terça (2) 09:00 em Brasília
    const now = new Date("2026-10-06T12:00:00Z");
    const ad = {
      status: AdvertisementStatus.ACTIVE,
      start_date: "2026-10-01",
      end_date: "2026-10-31",
    };
    expect(getAdSchedule({ ...ad, weekdays: [2] }, now)).toBe("live");
    expect(getAdSchedule({ ...ad, weekdays: [0, 6] }, now)).toBe("offHours");
    expect(
      getAdSchedule({ ...ad, daily_start: "18:00", daily_end: "22:00" }, now)
    ).toBe("offHours");
  });
});
