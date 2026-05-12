import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    playEvent: { findMany: vi.fn() },
    libraryItem: { findMany: vi.fn() },
  },
}));

import { prisma } from "../../../db/client.js";
import { getTasteMap } from "../taste-map.service.js";

const mockPlayEvents = prisma.playEvent.findMany as ReturnType<typeof vi.fn>;
const mockLibrary = prisma.libraryItem.findMany as ReturnType<typeof vi.fn>;

function makePlayEvent(genre: string | null, isLocal = false) {
  return {
    track: {
      genre,
      isLocal,
      artists: [{ artist: { isLocal } }],
    },
  };
}

function makeLikedItem(genre: string | null, isLocal = false) {
  return { track: { genre, isLocal } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLibrary.mockResolvedValue([]);
});

describe("getTasteMap", () => {
  it("aggregates play counts by genre", async () => {
    mockPlayEvents.mockResolvedValue([
      makePlayEvent("pop"),
      makePlayEvent("pop"),
      makePlayEvent("jazz"),
    ]);

    const result = await getTasteMap("user-1");

    const pop = result.genres.find((g) => g.genre === "pop");
    const jazz = result.genres.find((g) => g.genre === "jazz");
    expect(pop?.playCount).toBe(2);
    expect(jazz?.playCount).toBe(1);
  });

  it("uses 'other' for null genre", async () => {
    mockPlayEvents.mockResolvedValue([makePlayEvent(null)]);

    const result = await getTasteMap("user-1");

    expect(result.genres.find((g) => g.genre === "other")).toBeDefined();
  });

  it("calculates weight as fraction of total plays", async () => {
    mockPlayEvents.mockResolvedValue([
      makePlayEvent("pop"),
      makePlayEvent("pop"),
      makePlayEvent("jazz"),
    ]);

    const result = await getTasteMap("user-1");

    const pop = result.genres.find((g) => g.genre === "pop");
    expect(pop?.weight).toBeCloseTo(2 / 3, 2);
  });

  it("calculates affinityScore from likes/plays ratio", async () => {
    mockPlayEvents.mockResolvedValue([
      makePlayEvent("pop"),
      makePlayEvent("pop"),
      makePlayEvent("pop"),
      makePlayEvent("pop"),
    ]);
    mockLibrary.mockResolvedValue([makeLikedItem("pop"), makeLikedItem("pop")]);

    const result = await getTasteMap("user-1");

    const pop = result.genres.find((g) => g.genre === "pop");
    expect(pop?.affinityScore).toBeCloseTo(0.5, 2);
  });

  it("marks local genres correctly", async () => {
    mockPlayEvents.mockResolvedValue([makePlayEvent("folk", true)]);

    const result = await getTasteMap("user-1");

    const folk = result.genres.find((g) => g.genre === "folk");
    expect(folk?.isLocal).toBe(true);
  });

  it("sets topGenre to most played genre", async () => {
    mockPlayEvents.mockResolvedValue([
      makePlayEvent("rock"),
      makePlayEvent("pop"),
      makePlayEvent("pop"),
    ]);

    const result = await getTasteMap("user-1");

    expect(result.topGenre).toBe("pop");
  });

  it("returns empty genres when no plays", async () => {
    mockPlayEvents.mockResolvedValue([]);

    const result = await getTasteMap("user-1");

    expect(result.genres).toHaveLength(0);
    expect(result.totalPlays).toBe(0);
    expect(result.topGenre).toBeNull();
  });
});
