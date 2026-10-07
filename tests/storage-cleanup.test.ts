import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeClient } from "./helpers/fake-supabase";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
const STORAGE =
  "https://proj.supabase.co/storage/v1/object/public/advertisements";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.from,
    storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
  },
}));

import { cleanupOrphanUploads } from "@/lib/storage/cleanup";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const OLD = "2026-10-05T12:00:00Z";
const RECENT = "2026-10-07T11:00:00Z";

describe("cleanupOrphanUploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.remove.mockResolvedValue({ error: null });
    mocks.list.mockImplementation(async (prefix: string) => {
      if (prefix === "") {
        return { data: [{ id: null, name: "u1", created_at: null }], error: null };
      }
      return {
        data: [
          { id: "1", name: "usado.png", created_at: OLD },
          { id: "2", name: "orfao.png", created_at: OLD },
          { id: "3", name: "recente.png", created_at: RECENT },
          { id: "4", name: "capa.png", created_at: OLD },
        ],
        error: null,
      };
    });
    const { client } = fakeClient({
      advertisements: [
        {
          data: [
            {
              content_url: `${STORAGE}/u1/usado.png`,
              thumbnail_url: `${STORAGE}/u1/capa.png`,
            },
            { content_url: "https://youtu.be/x", thumbnail_url: null },
          ],
        },
      ],
    });
    mocks.from.mockImplementation(client.from);
  });

  it("apaga só arquivos sem uso e com mais de 24 h", async () => {
    const result = await cleanupOrphanUploads(NOW);
    expect(mocks.remove).toHaveBeenCalledWith(["u1/orfao.png"]);
    expect(result).toEqual({ scanned: 4, removed: 1 });
  });

  it("não chama remove quando não há órfãos", async () => {
    mocks.list.mockImplementation(async () => ({ data: [], error: null }));
    const result = await cleanupOrphanUploads(NOW);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(result.removed).toBe(0);
  });
});
