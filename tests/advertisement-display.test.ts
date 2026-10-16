import { describe, expect, it } from "vitest";
import {
  contentUrlProblem,
  directVideoUrl,
  endOfDay,
  getAdSchedule,
  getEmbedUrl,
  getVimeoVideo,
  getYoutubeEmbedUrl,
  getYoutubeThumbnailUrl,
  getYoutubeVideoId,
  isPlatformVideoUrl,
  startOfDay,
} from "@/lib/ads/advertisement";
import { AdvertisementStatus, AdvertisementType } from "@/types";

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

describe("Vimeo e validação de links", () => {
  it.each([
    ["https://vimeo.com/76979871", "76979871", null],
    ["https://vimeo.com/76979871/abc123ef", "76979871", "abc123ef"],
    ["https://vimeo.com/channels/staffpicks/76979871", "76979871", null],
    ["https://player.vimeo.com/video/76979871?h=ff00", "76979871", "ff00"],
  ])("reconhece %s", (url, id, hash) => {
    expect(getVimeoVideo(url)).toEqual({ id, hash });
  });

  it("monta o embed do Vimeo sem som, em loop e sem controles", () => {
    const embed = getEmbedUrl("https://vimeo.com/76979871/abc123ef")!;
    expect(embed).toContain("player.vimeo.com/video/76979871");
    expect(embed).toContain("background=1");
    expect(embed).toContain("muted=1");
    expect(embed).toContain("h=abc123ef");
  });
});

describe("outras plataformas e embeds genéricos", () => {
  it.each([
    ["https://www.dailymotion.com/video/x8abc12", "dailymotion.com/embed/video/x8abc12"],
    ["https://dai.ly/x8abc12", "dailymotion.com/embed/video/x8abc12"],
    ["https://www.loom.com/share/abc123", "loom.com/embed/abc123"],
    ["https://drive.google.com/file/d/FILEID/view?usp=sharing", "drive.google.com/file/d/FILEID/preview"],
    ["https://streamable.com/xyz9", "streamable.com/e/xyz9"],
    ["https://www.twitch.tv/canal", "player.twitch.tv/?channel=canal&parent=tela.exemplo.com"],
    ["https://www.twitch.tv/videos/123", "player.twitch.tv/?video=123"],
    ["https://www.facebook.com/pagina/videos/123", "facebook.com/plugins/video.php?href="],
  ])("converte %s", (url, expected) => {
    expect(getEmbedUrl(url, "tela.exemplo.com")).toContain(expected);
  });

  it("usa qualquer player https como está, inclusive colando o <iframe>", () => {
    expect(getEmbedUrl("https://player.exemplo.com/v/1")).toBe("https://player.exemplo.com/v/1");
    expect(
      getEmbedUrl('<iframe width="560" src="https://player.exemplo.com/v/1?a=1&amp;b=2" allowfullscreen></iframe>')
    ).toBe("https://player.exemplo.com/v/1?a=1&b=2");
    expect(getEmbedUrl("http://inseguro.com/v")).toBeNull();
    expect(getEmbedUrl("javascript:alert(1)")).toBeNull();
  });

  it("aceita qualquer fonte de vídeo, mas não vídeo no tipo imagem", () => {
    const yt = "https://www.youtube.com/watch?v=abc";
    expect(contentUrlProblem(AdvertisementType.EMBED_LINK, yt)).toBeNull();
    expect(contentUrlProblem(AdvertisementType.EMBED_LINK, "https://player.exemplo.com/x")).toBeNull();
    expect(contentUrlProblem(AdvertisementType.VIDEO_LINK, yt)).toBeNull();
    expect(contentUrlProblem(AdvertisementType.VIDEO_LINK, "https://cdn.exemplo.com/a.mp4")).toBeNull();
    expect(contentUrlProblem(AdvertisementType.IMAGE_LINK, yt)).not.toBeNull();
    expect(isPlatformVideoUrl(yt)).toBe(true);
    expect(isPlatformVideoUrl("https://cdn.exemplo.com/a.mp4")).toBe(false);
  });

  it("transforma link de compartilhamento do Dropbox em arquivo direto", () => {
    expect(directVideoUrl("https://www.dropbox.com/s/abc/video.mp4?dl=0")).toBe(
      "https://www.dropbox.com/s/abc/video.mp4?raw=1"
    );
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
