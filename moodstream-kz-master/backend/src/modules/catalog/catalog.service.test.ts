import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Mock prisma before importing the service ────────────────────────────────

vi.mock("../../db/client.js", () => ({
  prisma: {
    track: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    artist: {
      findUniqueOrThrow: vi.fn(),
    },
    release: {
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

import { prisma } from "../../db/client.js";
import {
  searchTracks,
  getHomeSections,
  getTrackById,
  getArtistById,
  getReleaseById,
} from "./catalog.service.js";

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTrackRow(overrides: Partial<{
  id: string;
  title: string;
  durationMs: number;
  playbackStatus: string;
  offlineEligible: boolean;
  isLocal: boolean;
  isExplicit: boolean;
  audioFormat: string | null;
  audioBitrate: number | null;
  catalogVisibilityReason: string | null;
  lastConfirmedAt: Date | null;
  createdAt: Date;
  release: { coverAssetUrl: string | null; id: string; title: string; slug: string; releaseType: string; releaseDate: Date | null; catalogVisibilityReason: string | null };
  artists: { artist: { id: string; name: string; slug: string } }[];
}> = {}) {
  return {
    id: "track-1",
    title: "Test Track",
    durationMs: 210000,
    playbackStatus: "PLAYABLE",
    offlineEligible: true,
    isLocal: true,
    isExplicit: false,
    audioFormat: "mp3",
    audioBitrate: 320,
    catalogVisibilityReason: null,
    lastConfirmedAt: null,
    createdAt: new Date("2026-01-01"),
    release: {
      id: "release-1",
      title: "Test Album",
      slug: "test-album",
      releaseType: "ALBUM",
      releaseDate: new Date("2026-01-01"),
      coverAssetUrl: "https://cdn.example.com/cover.jpg",
      catalogVisibilityReason: null,
    },
    artists: [{ artist: { id: "artist-1", name: "Dimash", slug: "dimash" } }],
    ...overrides,
  };
}

// ─── searchTracks ─────────────────────────────────────────────────────────────

describe("searchTracks", () => {
  it("returns empty page when no tracks match", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    const result = await searchTracks("xyz", "ru", "KZ", undefined, 20);
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("returns tracks with correct shape", async () => {
    const track = makeTrackRow();
    vi.mocked(prisma.track.findMany).mockResolvedValue([track] as never);

    const result = await searchTracks("test", "ru", "KZ", undefined, 20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "track-1",
      title: "Test Track",
      durationMs: 210000,
      playbackStatus: "PLAYABLE",
      offlineEligible: true,
      isLocal: true,
      coverUrl: "https://cdn.example.com/cover.jpg",
      artists: [{ id: "artist-1", name: "Dimash", slug: "dimash" }],
    });
  });

  it("paginates: sets nextCursor when items exceed limit", async () => {
    const tracks = Array.from({ length: 3 }, (_, i) =>
      makeTrackRow({ id: `track-${i}` }),
    );
    vi.mocked(prisma.track.findMany).mockResolvedValue(tracks as never);

    const result = await searchTracks("test", "ru", "KZ", undefined, 2);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("track-1");
  });

  it("returns null nextCursor when no more pages", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([makeTrackRow()] as never);

    const result = await searchTracks("test", "ru", "KZ", undefined, 20);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor to prisma when provided", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    await searchTracks("test", "ru", "KZ", "cursor-id", 20);
    expect(prisma.track.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "cursor-id" },
        skip: 1,
      }),
    );
  });

  it("generates transliteration variants for Cyrillic query", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    await searchTracks("димаш", "ru", "KZ", undefined, 20);
    const call = vi.mocked(prisma.track.findMany).mock.calls[0]![0] as { where: { OR: unknown[] } };
    // Cyrillic "димаш" should produce at least 2 variants (original + transliterated)
    expect(call.where.OR.length).toBeGreaterThanOrEqual(4); // 2 variants × 2 conditions (title + artist)
  });

  it("generates transliteration variants for Latin query", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    await searchTracks("dimash", "ru", "KZ", undefined, 20);
    const call = vi.mocked(prisma.track.findMany).mock.calls[0]![0] as { where: { OR: unknown[] } };
    // Latin "dimash" should produce at least 2 variants (original + Cyrillic)
    expect(call.where.OR.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── getHomeSections ──────────────────────────────────────────────────────────

describe("getHomeSections", () => {
  it("returns ru-localised section titles", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    const result = await getHomeSections("ru", "KZ");
    const ids = result.sections.map((s) => s.id);
    expect(ids).toContain("new-kz");
    expect(ids).toContain("popular");

    const newKz = result.sections.find((s) => s.id === "new-kz")!;
    expect(newKz.title).toBe("Новинки Казахстана");
  });

  it("returns kk-localised section titles", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    const result = await getHomeSections("kk", "KZ");
    const newKz = result.sections.find((s) => s.id === "new-kz")!;
    expect(newKz.title).toBe("Қазақстан жаңалықтары");
  });

  it("returns en-localised section titles", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    const result = await getHomeSections("en", "KZ");
    const newKz = result.sections.find((s) => s.id === "new-kz")!;
    expect(newKz.title).toBe("New from Kazakhstan");
  });

  it("includes kazakh-music section when it has tracks distinct from new-kz", async () => {
    const newKzTracks = [makeTrackRow({ id: "track-1" })];
    const popularTracks: never[] = [];
    // kazakhMusic has a track not in new-kz
    const kazakhMusicTracks = [makeTrackRow({ id: "track-2" })];

    vi.mocked(prisma.track.findMany)
      .mockResolvedValueOnce(newKzTracks as never)  // new-kz
      .mockResolvedValueOnce(popularTracks as never) // popular
      .mockResolvedValueOnce(kazakhMusicTracks as never); // kazakh-music

    const result = await getHomeSections("ru", "KZ");
    const ids = result.sections.map((s) => s.id);
    expect(ids).toContain("kazakh-music");
  });

  it("omits kazakh-music section when all its tracks overlap with new-kz", async () => {
    const sharedTrack = makeTrackRow({ id: "track-1" });

    vi.mocked(prisma.track.findMany)
      .mockResolvedValueOnce([sharedTrack] as never) // new-kz
      .mockResolvedValueOnce([] as never)            // popular
      .mockResolvedValueOnce([sharedTrack] as never); // kazakh-music (same track)

    const result = await getHomeSections("ru", "KZ");
    const ids = result.sections.map((s) => s.id);
    expect(ids).not.toContain("kazakh-music");
  });

  it("omits kazakh-music section when it is empty", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    const result = await getHomeSections("ru", "KZ");
    const ids = result.sections.map((s) => s.id);
    expect(ids).not.toContain("kazakh-music");
  });

  it("makes 3 parallel prisma calls", async () => {
    vi.mocked(prisma.track.findMany).mockResolvedValue([]);

    await getHomeSections("ru", "KZ");
    expect(prisma.track.findMany).toHaveBeenCalledTimes(3);
  });
});

// ─── getTrackById ─────────────────────────────────────────────────────────────

describe("getTrackById", () => {
  it("returns track with correct shape", async () => {
    vi.mocked(prisma.track.findUniqueOrThrow).mockResolvedValue(
      makeTrackRow() as never,
    );

    const result = await getTrackById("track-1");
    expect(result).toMatchObject({
      id: "track-1",
      title: "Test Track",
      durationMs: 210000,
      playbackStatus: "PLAYABLE",
      offlineEligible: true,
      isLocal: true,
      isExplicit: false,
      audioFormat: "mp3",
      audioBitrate: 320,
      artists: [{ id: "artist-1", name: "Dimash", slug: "dimash" }],
      coverUrl: "https://cdn.example.com/cover.jpg",
    });
  });

  it("maps release fields correctly", async () => {
    vi.mocked(prisma.track.findUniqueOrThrow).mockResolvedValue(
      makeTrackRow() as never,
    );

    const result = await getTrackById("track-1");
    expect(result.release).toMatchObject({
      id: "release-1",
      title: "Test Album",
      slug: "test-album",
      releaseType: "ALBUM",
    });
    expect(result.release.releaseDate).toBe("2026-01-01T00:00:00.000Z");
  });

  it("maps transparency fields correctly", async () => {
    vi.mocked(prisma.track.findUniqueOrThrow).mockResolvedValue(
      makeTrackRow({
        catalogVisibilityReason: "licensed",
        lastConfirmedAt: new Date("2026-03-01"),
      }) as never,
    );

    const result = await getTrackById("track-1");
    expect(result.transparency.visibilityReason).toBe("licensed");
    expect(result.transparency.lastConfirmedAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("propagates not-found error from prisma", async () => {
    vi.mocked(prisma.track.findUniqueOrThrow).mockRejectedValue(
      new Error("No Track found"),
    );

    await expect(getTrackById("bad-id")).rejects.toThrow("No Track found");
  });
});

// ─── getArtistById ────────────────────────────────────────────────────────────

describe("getArtistById", () => {
  function makeArtistRow(overrides = {}) {
    return {
      id: "artist-1",
      slug: "dimash",
      name: "Dimash",
      type: "SOLO",
      bio: "Казахский певец",
      coverUrl: null,
      isLocal: true,
      isVerified: true,
      _count: { followers: 42 },
      releases: [
        {
          id: "release-1",
          slug: "test-album",
          title: "Test Album",
          releaseType: "ALBUM",
          releaseDate: new Date("2026-01-01"),
          coverAssetUrl: "https://cdn.example.com/cover.jpg",
        },
      ],
      ...overrides,
    };
  }

  it("returns artist with correct shape", async () => {
    vi.mocked(prisma.artist.findUniqueOrThrow).mockResolvedValue(
      makeArtistRow() as never,
    );

    const result = await getArtistById("artist-1");
    expect(result).toMatchObject({
      id: "artist-1",
      slug: "dimash",
      name: "Dimash",
      type: "SOLO",
      bio: "Казахский певец",
      isLocal: true,
      isVerified: true,
    });
  });

  it("maps releases with ISO date", async () => {
    vi.mocked(prisma.artist.findUniqueOrThrow).mockResolvedValue(
      makeArtistRow() as never,
    );

    const result = await getArtistById("artist-1");
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]!.releaseDate).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns null releaseDate when not set", async () => {
    vi.mocked(prisma.artist.findUniqueOrThrow).mockResolvedValue(
      makeArtistRow({
        releases: [
          {
            id: "r-1", slug: "single", title: "Single",
            releaseType: "SINGLE", releaseDate: null, coverAssetUrl: null,
          },
        ],
      }) as never,
    );

    const result = await getArtistById("artist-1");
    expect(result.releases[0]!.releaseDate).toBeNull();
  });

  it("propagates not-found error", async () => {
    vi.mocked(prisma.artist.findUniqueOrThrow).mockRejectedValue(
      new Error("No Artist found"),
    );

    await expect(getArtistById("bad-id")).rejects.toThrow("No Artist found");
  });
});

// ─── getReleaseById ───────────────────────────────────────────────────────────

describe("getReleaseById", () => {
  function makeReleaseRow(overrides = {}) {
    return {
      id: "release-1",
      slug: "test-album",
      title: "Test Album",
      releaseType: "ALBUM",
      releaseDate: new Date("2026-01-01"),
      coverAssetUrl: "https://cdn.example.com/cover.jpg",
      artist: { id: "artist-1", name: "Dimash", slug: "dimash" },
      tracks: [makeTrackRow()],
      ...overrides,
    };
  }

  it("returns release with correct shape", async () => {
    vi.mocked(prisma.release.findUniqueOrThrow).mockResolvedValue(
      makeReleaseRow() as never,
    );

    const result = await getReleaseById("release-1");
    expect(result).toMatchObject({
      id: "release-1",
      slug: "test-album",
      title: "Test Album",
      releaseType: "ALBUM",
      coverAssetUrl: "https://cdn.example.com/cover.jpg",
      artist: { id: "artist-1", name: "Dimash", slug: "dimash" },
    });
    expect(result.releaseDate).toBe("2026-01-01T00:00:00.000Z");
  });

  it("maps tracks with correct shape", async () => {
    vi.mocked(prisma.release.findUniqueOrThrow).mockResolvedValue(
      makeReleaseRow() as never,
    );

    const result = await getReleaseById("release-1");
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0]).toMatchObject({
      id: "track-1",
      title: "Test Track",
      durationMs: 210000,
    });
  });

  it("returns empty tracks array when release has no playable tracks", async () => {
    vi.mocked(prisma.release.findUniqueOrThrow).mockResolvedValue(
      makeReleaseRow({ tracks: [] }) as never,
    );

    const result = await getReleaseById("release-1");
    expect(result.tracks).toHaveLength(0);
  });

  it("returns null releaseDate when not set", async () => {
    vi.mocked(prisma.release.findUniqueOrThrow).mockResolvedValue(
      makeReleaseRow({ releaseDate: null }) as never,
    );

    const result = await getReleaseById("release-1");
    expect(result.releaseDate).toBeNull();
  });

  it("propagates not-found error", async () => {
    vi.mocked(prisma.release.findUniqueOrThrow).mockRejectedValue(
      new Error("No Release found"),
    );

    await expect(getReleaseById("bad-id")).rejects.toThrow("No Release found");
  });
});
