import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    track: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../utils/redis.js", () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

import { prisma } from "../../../db/client.js";
import { redis } from "../../../utils/redis.js";
import { getLyrics } from "../lyrics.service.js";

const mockTrack = prisma.track.findUnique as ReturnType<typeof vi.fn>;
const mockRedisGet = redis.get as ReturnType<typeof vi.fn>;
const mockRedisSet = redis.setex as ReturnType<typeof vi.fn>;

function makeTrack(overrides = {}) {
  return {
    id: "track-1",
    title: "Test Song",
    durationMs: 210_000,
    artists: [{ artist: { name: "Test Artist" } }],
    release: { title: "Test Album" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue("OK");
  global.fetch = vi.fn();
});

describe("getLyrics", () => {
  it("returns cached result when available", async () => {
    const cached = { synced: true, lines: [{ timeMs: 0, text: "Hello" }], plainText: "Hello", source: "cache" };
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));

    const result = await getLyrics("track-1");

    expect(result.source).toBe("cache");
    expect(result.lines).toHaveLength(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns none when track not found", async () => {
    mockTrack.mockResolvedValue(null);

    const result = await getLyrics("nonexistent");

    expect(result.source).toBe("none");
    expect(result.lines).toHaveLength(0);
  });

  it("parses synced LRC lyrics from LRCLIB", async () => {
    mockTrack.mockResolvedValue(makeTrack());
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        syncedLyrics: "[00:01.00]Hello world\n[00:03.50]Second line",
        plainLyrics: "Hello world\nSecond line",
      }),
    });

    const result = await getLyrics("track-1");

    expect(result.synced).toBe(true);
    expect(result.source).toBe("lrclib");
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.timeMs).toBe(1000);
    expect(result.lines[0]?.text).toBe("Hello world");
    expect(result.lines[1]?.timeMs).toBe(3500);
  });

  it("returns plain text when only plainLyrics available", async () => {
    mockTrack.mockResolvedValue(makeTrack());
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        syncedLyrics: null,
        plainLyrics: "Line 1\nLine 2\nLine 3",
      }),
    });

    const result = await getLyrics("track-1");

    expect(result.synced).toBe(false);
    expect(result.plainText).toBe("Line 1\nLine 2\nLine 3");
    expect(result.lines).toHaveLength(3);
  });

  it("returns none when LRCLIB returns 404", async () => {
    mockTrack.mockResolvedValue(makeTrack());
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });

    const result = await getLyrics("track-1");

    expect(result.source).toBe("none");
    expect(result.lines).toHaveLength(0);
  });

  it("returns none when LRCLIB fetch throws", async () => {
    mockTrack.mockResolvedValue(makeTrack());
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    const result = await getLyrics("track-1");

    expect(result.source).toBe("none");
  });

  it("caches result after successful fetch", async () => {
    mockTrack.mockResolvedValue(makeTrack());
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        syncedLyrics: "[00:01.00]Hello",
        plainLyrics: "Hello",
      }),
    });

    await getLyrics("track-1");

    expect(mockRedisSet).toHaveBeenCalledWith(
      "lyrics:track-1",
      expect.any(Number),
      expect.any(String),
    );
  });
});
