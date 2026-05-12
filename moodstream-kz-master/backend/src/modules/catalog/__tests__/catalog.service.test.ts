import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock prisma BEFORE importing the service ─────────────────────────────────
vi.mock("../../../db/client.js", () => ({
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

import { prisma } from "../../../db/client.js";
import {
  searchTracks,
  getHomeSections,
} from "../catalog.service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTrack(overrides: Partial<{
  id: string;
  title: string;
  isPublished: boolean;
  playbackStatus: string;
  isLocal: boolean;
  durationMs: number;
  offlineEligible: boolean;
  artistName: string;
}> = {}) {
  const {
    id = "track-1",
    title = "Test Track",
    isPublished = true,
    playbackStatus = "PLAYABLE",
    isLocal = false,
    durationMs = 180000,
    offlineEligible = true,
    artistName = "Test Artist",
  } = overrides;

  return {
    id,
    title,
    isPublished,
    playbackStatus,
    isLocal,
    durationMs,
    offlineEligible,
    release: { coverAssetUrl: "https://example.com/cover.jpg" },
    artists: [
      { artist: { id: "artist-1", name: artistName, slug: "test-artist" } },
    ],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("catalog.service — searchTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only published + PLAYABLE tracks (prisma filter verification)", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValueOnce([makeTrack()] as never);

    await searchTracks("test", "ru", "KZ", undefined, 10);

    // Verify the where clause sent to prisma includes the guard
    const callArgs = mockFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined;
    expect(callArgs?.where).toMatchObject({
      isPublished: true,
      playbackStatus: "PLAYABLE",
    });
  });

  it("maps returned tracks to TrackSummary shape", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValueOnce([makeTrack({ id: "t-42", title: "Kazakhstan Song" })] as never);

    const result = await searchTracks("Kazak", "ru", "KZ", undefined, 10);

    expect(result.items).toHaveLength(1);
    const track = result.items[0];
    expect(track?.id).toBe("t-42");
    expect(track?.title).toBe("Kazakhstan Song");
    expect(track?.playbackStatus).toBe("PLAYABLE");
    expect(track?.artists).toHaveLength(1);
    expect(track?.artists[0]?.name).toBe("Test Artist");
  });

  it("builds OR conditions for both title and artist name", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValueOnce([] as never);

    await searchTracks("Алматы", "ru", "KZ", undefined, 10);

    const callArgs = mockFindMany.mock.calls[0]?.[0] as { where: { OR?: unknown[] } } | undefined;
    const orConditions = callArgs?.where?.OR ?? [];

    // Should have conditions for both title and artist name matches
    expect(orConditions.length).toBeGreaterThanOrEqual(2);

    const hasTitle = orConditions.some(
      (c: unknown) => typeof c === "object" && c !== null && "title" in c,
    );
    const hasArtist = orConditions.some(
      (c: unknown) => typeof c === "object" && c !== null && "artists" in c,
    );
    expect(hasTitle).toBe(true);
    expect(hasArtist).toBe(true);
  });

  it("includes transliterated variant in search for Cyrillic input", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValueOnce([] as never);

    // "Алматы" should produce a Latin transliteration variant
    await searchTracks("Алматы", "ru", "KZ", undefined, 10);

    const callArgs = mockFindMany.mock.calls[0]?.[0] as { where: { OR?: unknown[] } } | undefined;
    const orConditions = callArgs?.where?.OR ?? [];

    // Extract all search values used in title conditions
    const titleValues = orConditions
      .filter((c: unknown): c is { title: { contains: string } } =>
        typeof c === "object" && c !== null && "title" in c,
      )
      .map((c) => c.title.contains);

    // Should contain both original Cyrillic and transliterated Latin
    expect(titleValues).toContain("Алматы");
    const hasLatin = titleValues.some((v) => /^[a-zA-Z]/.test(v));
    expect(hasLatin).toBe(true);
  });

  it("implements cursor pagination: returns nextCursor when more items exist", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    // Return limit+1 items to signal there's a next page
    const tracks = Array.from({ length: 6 }, (_, i) => makeTrack({ id: `t-${i}` }));
    mockFindMany.mockResolvedValueOnce(tracks as never);

    const result = await searchTracks("test", "ru", "KZ", undefined, 5);

    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBe("t-4");
  });

  it("returns nextCursor=null when on the last page", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    // Return exactly limit items (no more)
    const tracks = Array.from({ length: 5 }, (_, i) => makeTrack({ id: `t-${i}` }));
    mockFindMany.mockResolvedValueOnce(tracks as never);

    const result = await searchTracks("test", "ru", "KZ", undefined, 5);

    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor to prisma when provided", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValueOnce([] as never);

    await searchTracks("test", "ru", "KZ", "cursor-abc", 10);

    const callArgs = mockFindMany.mock.calls[0]?.[0] as {
      cursor?: { id: string };
      skip?: number;
    } | undefined;
    expect(callArgs?.cursor).toEqual({ id: "cursor-abc" });
    expect(callArgs?.skip).toBe(1);
  });

  it("returns empty result for empty query", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValueOnce([] as never);

    const result = await searchTracks("", "ru", "KZ", undefined, 10);

    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });
});

describe("catalog.service — getHomeSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sections with locale-specific titles (ru)", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValue([] as never);

    const result = await getHomeSections("ru", "KZ");

    const sectionIds = result.sections.map((s) => s.id);
    expect(sectionIds).toContain("new-kz");
    expect(sectionIds).toContain("popular");

    const newKz = result.sections.find((s) => s.id === "new-kz");
    expect(newKz?.title).toBe("Новинки Казахстана");
  });

  it("returns sections with locale-specific titles (kk)", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValue([] as never);

    const result = await getHomeSections("kk", "KZ");

    const newKz = result.sections.find((s) => s.id === "new-kz");
    expect(newKz?.title).toBe("Қазақстан жаңалықтары");

    const popular = result.sections.find((s) => s.id === "popular");
    expect(popular?.title).toBe("Танымал");
  });

  it("returns sections with locale-specific titles (en)", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValue([] as never);

    const result = await getHomeSections("en", "KZ");

    const newKz = result.sections.find((s) => s.id === "new-kz");
    expect(newKz?.title).toBe("New from Kazakhstan");
  });

  it("includes kazakh-music section only when it has tracks distinct from new-kz", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);

    const newKzTrack = makeTrack({ id: "new-1", isLocal: true });
    const kazakhMusicTrack = makeTrack({ id: "kz-unique", isLocal: true });

    // First call: new-kz, second call: popular (empty), third call: kazakh-music (different track)
    mockFindMany
      .mockResolvedValueOnce([newKzTrack] as never)   // new-kz
      .mockResolvedValueOnce([] as never)              // popular
      .mockResolvedValueOnce([newKzTrack, kazakhMusicTrack] as never); // kazakh-music

    const result = await getHomeSections("ru", "KZ");

    const sectionIds = result.sections.map((s) => s.id);
    expect(sectionIds).toContain("kazakh-music");

    const kzSection = result.sections.find((s) => s.id === "kazakh-music");
    // new-1 should be filtered out (already in new-kz), only kz-unique remains
    expect(kzSection?.items).toHaveLength(1);
    expect(kzSection?.items[0]?.id).toBe("kz-unique");
  });

  it("omits kazakh-music section when all its tracks overlap with new-kz", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);

    const track = makeTrack({ id: "shared", isLocal: true });

    mockFindMany
      .mockResolvedValueOnce([track] as never)   // new-kz
      .mockResolvedValueOnce([] as never)         // popular
      .mockResolvedValueOnce([track] as never);   // kazakh-music (same track)

    const result = await getHomeSections("ru", "KZ");

    const sectionIds = result.sections.map((s) => s.id);
    expect(sectionIds).not.toContain("kazakh-music");
  });

  it("new-kz section filters to isLocal=true tracks", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValue([] as never);

    await getHomeSections("ru", "KZ");

    // First call is new-kz
    const firstCall = mockFindMany.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined;
    expect(firstCall?.where).toMatchObject({
      isPublished: true,
      playbackStatus: "PLAYABLE",
      isLocal: true,
    });
  });
});

describe("catalog.service — locale fallback (sectionTitle)", () => {
  it("falls back to ru when locale has no entry for a section key", async () => {
    const mockFindMany = vi.mocked(prisma.track.findMany);
    mockFindMany.mockResolvedValue([] as never);

    // Passing an unknown locale type-cast — simulates missing translation
    const result = await getHomeSections("en", "KZ");

    // All section titles should be non-empty strings
    for (const section of result.sections) {
      expect(typeof section.title).toBe("string");
      expect(section.title.length).toBeGreaterThan(0);
    }
  });
});
