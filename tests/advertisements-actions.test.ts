import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvertisementStatus, AdvertisementType } from "@/types";

const mocks = vi.hoisted(() => ({ getAuthContext: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthContext: mocks.getAuthContext }));

import { createAdvertisement } from "@/actions/advertisements";

const base = {
  title: "Promoção",
  type: AdvertisementType.IMAGE_LINK,
  start_date: "2026-10-01T00:00:00.000Z",
  end_date: "2026-10-31T23:59:59.999Z",
  duration_seconds: 10,
  status: AdvertisementStatus.ACTIVE,
  company_ids: ["c1"],
};

describe("createAdvertisement", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["javascript:alert(document.cookie)", "data:text/html,<script>"])(
    "recusa conteúdo com URL perigosa (%s)",
    async (url) => {
      const result = await createAdvertisement({ ...base, content_url: url });
      expect(result.success).toBe(false);
      expect(result.message).toHaveProperty("content_url");
      expect(mocks.getAuthContext).not.toHaveBeenCalled();
    }
  );

  it("recusa capa com URL perigosa", async () => {
    const result = await createAdvertisement({
      ...base,
      content_url: "https://exemplo.com/a.png",
      thumbnail_url: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
    expect(result.message).toHaveProperty("thumbnail_url");
  });
});
