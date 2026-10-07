import { describe, expect, it } from "vitest";
import { formatSince, getDisplayStatus } from "@/lib/display-status";

const NOW = Date.parse("2026-10-07T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("getDisplayStatus", () => {
  it("online até 2 min sem contato", () => {
    expect(getDisplayStatus(ago(30_000), NOW)).toBe("online");
    expect(getDisplayStatus(ago(120_000), NOW)).toBe("online");
    expect(getDisplayStatus(ago(121_000), NOW)).toBe("offline");
    expect(getDisplayStatus(null, NOW)).toBe("never");
  });
});

describe("formatSince", () => {
  it("formata o tempo desde o último contato", () => {
    expect(formatSince(ago(10_000), NOW)).toBe("agora");
    expect(formatSince(ago(5 * 60_000), NOW)).toBe("há 5 min");
    expect(formatSince(ago(3 * 3600_000), NOW)).toBe("há 3 h");
    expect(formatSince(ago(26 * 3600_000), NOW)).toBe("há 1 dia");
    expect(formatSince(ago(50 * 3600_000), NOW)).toBe("há 2 dias");
  });
});
