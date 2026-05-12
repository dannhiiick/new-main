import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    recommendationFeedback: { findMany: vi.fn() },
    track: { findMany: vi.fn() },
    playEvent: { findMany: vi.fn() },
  },
}));

import { prisma } from "../../../db/client.js";
import {
  getGenreBridge,
  getWeeklyBridgeSuggestion,
  GenreNotFoundError,
} from "../genre-bridges.service.js";

const mockFeedback = prisma.recommendationFeedback.findMany as ReturnType<typeof vi.fn>;
const mockTrack = prisma.track.findMany as ReturnType<typeof vi.fn>;
const mockPlayEvent = prisma.playEvent.findMany as ReturnType<typeof vi.fn>;

function makeTrack(id: string, genre: string, plays = 100, likes = 10) {
  return {
    id,
    title: `Track ${id}`,
    durationMs: 180_000,
    isLocal: false,
    offlineEligible: true,
    playbackStatus: "PLAYABLE",
    genre,
    createdAt: new Date("2024-06-01"),
    release: { coverAssetUrl: null, releaseDate: new Date("2024-06-01") },
    artists: [{ artist: { id: "a1", name: "Artist", slug: "artist", isLocal: false } }],
    _count: { playEvents: plays, libraryItems: likes },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFeedback.mockResolvedValue([]);
});

describe("getGenreBridge", () => {
  it("returns tracks from both genres", async () => {
    mockTrack
      .mockResolvedValueOnce([makeTrack("pop-1", "pop"), makeTrack("pop-2", "pop")])
      .mockResolvedValueOnce([makeTrack("jazz-1", "jazz"), makeTrack("jazz-2", "jazz")]);

    const result = await getGenreBridge("pop", "jazz", "user-1", 4);

    expect(result.fromGenre).toBe("pop");
    expect(result.toGenre).toBe("jazz");
    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks.length).toBeLessThanOrEqual(4);
  });

  it("throws GenreNotFoundError when from genre has no tracks", async () => {
    mockTrack
      .mockResolvedValueOnce([]) // empty from
      .mockResolvedValueOnce([makeTrack("jazz-1", "jazz")]);

    await expect(getGenreBridge("nonexistent", "jazz", "user-1")).rejects.toThrow(
      GenreNotFoundError,
    );
  });

  it("throws GenreNotFoundError when to genre has no tracks", async () => {
    mockTrack
      .mockResolvedValueOnce([makeTrack("pop-1", "pop")])
      .mockResolvedValueOnce([]); // empty to

    await expect(getGenreBridge("pop", "nonexistent", "user-1")).rejects.toThrow(
      GenreNotFoundError,
    );
  });

  it("excludes hidden tracks", async () => {
    mockFeedback.mockResolvedValue([{ kind: "HIDE_TRACK", trackId: "pop-1" }]);
    mockTrack
      .mockResolvedValueOnce([makeTrack("pop-2", "pop")])
      .mockResolvedValueOnce([makeTrack("jazz-1", "jazz")]);

    const result = await getGenreBridge("pop", "jazz", "user-1");

    const ids = result.tracks.map((t) => t.track.id);
    expect(ids).not.toContain("pop-1");
  });

  it("each bridge track has bridgeScore", async () => {
    mockTrack
      .mockResolvedValueOnce([makeTrack("pop-1", "pop")])
      .mockResolvedValueOnce([makeTrack("jazz-1", "jazz")]);

    const result = await getGenreBridge("pop", "jazz", "user-1");

    for (const bt of result.tracks) {
      expect(bt.bridgeScore).toBeGreaterThan(0);
    }
  });
});

describe("getWeeklyBridgeSuggestion", () => {
  it("returns top 2 genres from play history", async () => {
    mockPlayEvent.mockResolvedValue([
      { track: { genre: "pop" } },
      { track: { genre: "pop" } },
      { track: { genre: "pop" } },
      { track: { genre: "jazz" } },
      { track: { genre: "jazz" } },
      { track: { genre: "rock" } },
    ]);

    const result = await getWeeklyBridgeSuggestion("user-1");

    expect(result.fromGenre).toBe("pop");
    expect(result.toGenre).toBe("jazz");
  });

  it("returns nulls when no play history", async () => {
    mockPlayEvent.mockResolvedValue([]);

    const result = await getWeeklyBridgeSuggestion("user-1");

    expect(result.fromGenre).toBeNull();
    expect(result.toGenre).toBeNull();
  });
});
