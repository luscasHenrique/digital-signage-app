import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorFingerprint, groupErrors } from "@/lib/error-report-format";

describe("agrupamento de erros", () => {
  it("ignora ids, números e URLs ao comparar mensagens", () => {
    expect(errorFingerprint("Falha 500 em https://x.com/a?b=1 id 3f2b1c4d-1111-4222-8333-444455556666")).toBe(
      "Falha <n> em <url> id <id>"
    );
  });

  it("conta por origem + mensagem e ordena pelos mais frequentes", () => {
    const groups = groupErrors([
      { source: "display", message: "Timeout 30s", created_at: "2026-10-07T10:00:00Z" },
      { source: "display", message: "Timeout 45s", created_at: "2026-10-07T11:00:00Z" },
      { source: "server", message: "Timeout 30s", created_at: "2026-10-07T09:00:00Z" },
    ]);
    expect(groups.map((g) => [g.source, g.count, g.last])).toEqual([
      ["display", 2, "2026-10-07T11:00:00Z"],
      ["server", 1, "2026-10-07T09:00:00Z"],
    ]);
  });
});

describe("reportClientError", () => {
  const fetchMock = vi.fn();

  beforeEach(async () => {
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", { location: { pathname: "/display/loja", href: "http://x/display/loja" } });
    const { resetErrorReporter } = await import("@/lib/error-reporter");
    resetErrorReporter();
  });

  it("envia uma vez e ignora repetições dentro de 1 min", async () => {
    const { reportClientError } = await import("@/lib/error-reporter");
    reportClientError(new Error("Mídia quebrada"));
    reportClientError(new Error("Mídia quebrada"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/errors");
    const body = JSON.parse(init.body);
    // Página /display/... vira origem "display"
    expect(body).toMatchObject({ source: "display", message: "Mídia quebrada", url: "http://x/display/loja" });
  });
});
