import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    recommendationFeedback: { findMany: vi.fn() },
    libraryItem: { findMany: vi.fn() },
    trackArtist: { findMany: vi.fn() },
    track: { findMany: vi.fn() },
    playEvent: { groupBy: vi.fn() },
  },
}));

import { prisma } from "../../../db/client.js";
import { getUndergroundTracks } from "../recommendations.service.js";

const mockFeedback = prisma.recommendationFeedback.findMany as ReturnType<typeof vi.fn>;
const mockLibrary = prisma.libraryItem.findMany as ReturnType<typeof vi.fn>;
const mockTrackArtist = prisma.trackArtist.findMany as ReturnType<typeof vi.fn>;
const mockTrack = prisma.track.findMany as ReturnType<typeof vi.fn>;
const mockPlayEventGroupBy = prisma.playEvent.groupBy as ReturnType<typeof vi.fn>;

function makeTrack(id: string, playEvents: number, libraryItems: number, isLocal = false) {
  return {
    id,
    title: `Track ${id}`,
    durationMs: 200_000,
    isLocal,
    createdAt: new Date("2025-01-01"),
    release: {
      id: `rel-${id}`,
      title: `Album ${id}`,
      coverAssetUrl: null,
      releaseDate: new Date("2025-01-01"),
    },
    artists: [
      { artist: { id: `artist-${id}`, name: `Artist ${id}`, isLocal } },
    ],
    _count: { playEvents, libraryItems },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFeedback.mockResolvedValue([]);
  mockLibrary.mockResolvedValue([]);
  mockTrackArtist.mockResolvedValue([]);
  mockPlayEventGroupBy.mockResolvedValue([]);
});

describe("getUndergroundTracks", () => {
  it("returns only tracks below the play count threshold", async () => {
    mockTrack.mockResolvedValue([
      makeTrack("t1", 500, 5),
      makeTrack("t2", 15_000, 2),  // over threshold
      makeTrack("t3", 9_999, 10),
    ]);

    const result = await getUndergroundTracks("user-1", { threshold: 10_000 });

    const ids = result.items.map((i) => i.id);
    expect(ids).toContain("t1");
    expect(ids).toContain("t3");
    expect(ids).not.toContain("t2");
  });

  it("excludes hidden tracks from feedback", async () => {
    mockFeedback.mockResolvedValue([
      { kind: "HIDE_TRACK", trackId: "t1" },
    ]);
    mockTrack.mockResolvedValue([makeTrack("t2", 100, 1)]);

    const result = await getUndergroundTracks("user-1", { threshold: 10_000 });

    const ids = result.items.map((i) => i.id);
    expect(ids).not.toContain("t1");
    expect(ids).toContain("t2");
  });

  it("excludes liked tracks from results", async () => {
    mockLibrary.mockResolvedValue([{ trackId: "t1" }]);
    mockTrack.mockResolvedValue([makeTrack("t2", 200, 0)]);

    const result = await getUndergroundTracks("user-1", { threshold: 10_000 });

    const ids = result.items.map((i) => i.id);
    expect(ids).not.toContain("t1");
  });

  it("scores local tracks higher", async () => {
    mockTrack.mockResolvedValue([
      makeTrack("global", 100, 0, false),
      makeTrack("local", 100, 0, true),
    ]);

    const result = await getUndergroundTracks("user-1", { threshold: 10_000 });
    const localItem = result.items.find((i) => i.id === "local");
    const globalItem = result.items.find((i) => i.id === "global");

    expect(localItem).toBeDefined();
    expect(globalItem).toBeDefined();
    expect(localItem!.score).toBeGreaterThan(globalItem!.score);
  });

  it("exposes playCount on each item", async () => {
    mockTrack.mockResolvedValue([makeTrack("t1", 42, 3)]);

    const result = await getUndergroundTracks("user-1", { threshold: 10_000 });

    expect(result.items[0]?.playCount).toBe(42);
  });

  it("returns nextCursor when more items exist", async () => {
    const tracks = Array.from({ length: 5 }, (_, i) => makeTrack(`t${i}`, i * 10, 0));
    mockTrack.mockResolvedValue(tracks);

    const result = await getUndergroundTracks("user-1", { limit: 3, threshold: 10_000 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeTruthy();
  });

  it("returns null nextCursor when on last page", async () => {
    mockTrack.mockResolvedValue([makeTrack("t1", 50, 0)]);

    const result = await getUndergroundTracks("user-1", { limit: 10, threshold: 10_000 });

    expect(result.nextCursor).toBeNull();
  });
});
