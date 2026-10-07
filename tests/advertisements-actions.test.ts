import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvertisementStatus, AdvertisementType } from "@/types";
import { fakeClient } from "./helpers/fake-supabase";

// Host do Supabase usado para reconhecer arquivos do próprio bucket
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  adminFrom: vi.fn(),
  storageRemove: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mocks.adminFrom,
    storage: { from: () => ({ remove: mocks.storageRemove }) },
  },
}));

import {
  createAdvertisement,
  deleteAdvertisement,
  discardUploads,
} from "@/actions/advertisements";

const STORAGE =
  "https://proj.supabase.co/storage/v1/object/public/advertisements";

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

describe("limpeza do Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageRemove.mockResolvedValue({ error: null });
  });

  /** Fila de respostas do cliente admin: [usados como conteúdo, usados como capa]. */
  function adminUsage(content: string[], thumbs: string[]) {
    const { client } = fakeClient({
      advertisements: [
        { data: content.map((content_url) => ({ content_url })) },
        { data: thumbs.map((thumbnail_url) => ({ thumbnail_url })) },
      ],
    });
    mocks.adminFrom.mockImplementation(client.from);
  }

  it("excluir anúncio de outro usuário apaga a mídia com a service role", async () => {
    const ad = {
      id: "ad1",
      content_url: `${STORAGE}/outro-usuario/video.mp4`,
      thumbnail_url: null,
    };
    const { client } = fakeClient({
      advertisements: [{ data: ad }, {}],
    });
    mocks.getAuthContext.mockResolvedValue({
      user: { id: "eu" },
      supabase: client,
    });
    adminUsage([], []);

    const result = await deleteAdvertisement("ad1");
    expect(result.success).toBe(true);
    expect(mocks.storageRemove).toHaveBeenCalledWith([
      "outro-usuario/video.mp4",
    ]);
  });

  it("não apaga arquivo que outro anúncio ainda usa", async () => {
    mocks.getAuthContext.mockResolvedValue({ user: { id: "eu" } });
    const usado = `${STORAGE}/eu/usado.png`;
    const livre = `${STORAGE}/eu/livre.png`;
    adminUsage([usado], []);

    await discardUploads([usado, livre]);
    expect(mocks.storageRemove).toHaveBeenCalledWith(["eu/livre.png"]);
  });

  it("descartar uploads ignora arquivos de outros usuários", async () => {
    mocks.getAuthContext.mockResolvedValue({ user: { id: "eu" } });

    const result = await discardUploads([`${STORAGE}/outro/a.png`]);
    expect(result.message).toBe("Nada a remover.");
    expect(mocks.storageRemove).not.toHaveBeenCalled();
  });
});
