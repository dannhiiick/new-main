import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock prisma BEFORE importing the service ─────────────────────────────────
vi.mock("../../../db/client.js", () => ({
  prisma: {
    track: {
      findUnique: vi.fn(),
    },
    libraryItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../db/client.js";
import {
  getLikedTracks,
  likeTrack,
  unlikeTrack,
  isTrackLiked,
  TrackNotFoundError,
  AlreadyLikedError,
} from "../library.service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLibraryItem(overrides: Partial<{
  id: string;
  userId: string;
  trackId: string;
  entityType: string;
  removedAt: Date | null;
}> = {}) {
  const id = overrides.id ?? "lib-1";
  return {
    id,
    userId: "user-1",
    trackId: "track-1",
    entityType: "TRACK",
    removedAt: null,
    cursor: BigInt(1),
    track: {
      id: "track-1",
      title: "Test Track",
      durationMs: 180000,
      playbackStatus: "PLAYABLE",
      offlineEligible: true,
      isLocal: false,
      release: { coverAssetUrl: "https://example.com/cover.jpg" },
      artists: [
        { artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" } },
      ],
    },
    ...overrides,
  };
}

function makeTrack(overrides: Partial<{ id: string }> = {}) {
  return { id: overrides.id ?? "track-1" };
}

// ── getLikedTracks ────────────────────────────────────────────────────────────

describe("library.service — getLikedTracks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only published + playable tracks (guard in prisma query)", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    mockFindMany.mockResolvedValueOnce([makeLibraryItem()] as never);

    await getLikedTracks("user-1", undefined, 10);

    const callArgs = mockFindMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    } | undefined;

    expect(callArgs?.where).toMatchObject({
      userId: "user-1",
      entityType: "TRACK",
      removedAt: null,
      track: {
        isPublished: true,
        playbackStatus: "PLAYABLE",
      },
    });
  });

  it("maps library items to TrackSummary shape", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    mockFindMany.mockResolvedValueOnce([
      makeLibraryItem({ id: "lib-1", trackId: "t-42" }),
    ] as never);

    const result = await getLikedTracks("user-1", undefined, 10);

    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item?.id).toBe("track-1");
    expect(item?.title).toBe("Test Track");
    expect(item?.playbackStatus).toBe("PLAYABLE");
    expect(item?.artists[0]?.name).toBe("Test Artist");
  });

  it("implements append-only semantics: removedAt=null filter excludes soft-deleted entries", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    // Only the active item would be returned by Prisma (filter applied at DB level)
    const activeItem = makeLibraryItem({ id: "lib-active" });
    mockFindMany.mockResolvedValueOnce([activeItem] as never);

    const result = await getLikedTracks("user-1", undefined, 10);

    // Verify the query explicitly filters removedAt: null
    const callArgs = mockFindMany.mock.calls[0]?.[0] as {
      where: { removedAt: unknown };
    } | undefined;
    expect(callArgs?.where.removedAt).toBeNull();

    expect(result.items).toHaveLength(1);
  });

  it("implements cursor pagination: returns nextCursor when more items exist", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    const items = Array.from({ length: 6 }, (_, i) =>
      makeLibraryItem({ id: `lib-${i}`, trackId: `t-${i}` }),
    );
    mockFindMany.mockResolvedValueOnce(items as never);

    const result = await getLikedTracks("user-1", undefined, 5);

    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBe("lib-4");
  });

  it("returns nextCursor=null when on the last page", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    const items = Array.from({ length: 5 }, (_, i) =>
      makeLibraryItem({ id: `lib-${i}`, trackId: `t-${i}` }),
    );
    mockFindMany.mockResolvedValueOnce(items as never);

    const result = await getLikedTracks("user-1", undefined, 5);

    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });

  it("passes cursor to prisma when provided", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    mockFindMany.mockResolvedValueOnce([] as never);

    await getLikedTracks("user-1", "lib-cursor-abc", 10);

    const callArgs = mockFindMany.mock.calls[0]?.[0] as {
      cursor?: { id: string };
      skip?: number;
    } | undefined;
    expect(callArgs?.cursor).toEqual({ id: "lib-cursor-abc" });
    expect(callArgs?.skip).toBe(1);
  });

  it("skips library items where track is null (dangling reference guard)", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    const itemWithNullTrack = { ...makeLibraryItem(), track: null };
    const itemWithTrack = makeLibraryItem({ id: "lib-2", trackId: "t-2" });

    mockFindMany.mockResolvedValueOnce([itemWithNullTrack, itemWithTrack] as never);

    const result = await getLikedTracks("user-1", undefined, 10);

    // The null-track item should be silently skipped
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("track-1");
  });

  it("orders by cursor descending (most recently added first)", async () => {
    const mockFindMany = vi.mocked(prisma.libraryItem.findMany);
    mockFindMany.mockResolvedValueOnce([] as never);

    await getLikedTracks("user-1", undefined, 10);

    const callArgs = mockFindMany.mock.calls[0]?.[0] as {
      orderBy?: { cursor?: string };
    } | undefined;
    expect(callArgs?.orderBy).toEqual({ cursor: "desc" });
  });
});

// ── likeTrack ─────────────────────────────────────────────────────────────────

describe("library.service — likeTrack (append-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new library item for a valid, published, playable track", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValueOnce(makeTrack() as never);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(null); // not already liked
    vi.mocked(prisma.libraryItem.create).mockResolvedValueOnce(makeLibraryItem() as never);

    await likeTrack("user-1", "track-1");

    expect(prisma.libraryItem.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        entityType: "TRACK",
        trackId: "track-1",
      },
    });
  });

  it("verifies track is published and playable before liking", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValueOnce(makeTrack() as never);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.libraryItem.create).mockResolvedValueOnce({} as never);

    await likeTrack("user-1", "track-1");

    expect(prisma.track.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "track-1", isPublished: true, playbackStatus: "PLAYABLE" },
      }),
    );
  });

  it("throws TrackNotFoundError when track does not exist or is not playable", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValueOnce(null);

    await expect(likeTrack("user-1", "non-existent")).rejects.toThrow(TrackNotFoundError);
    expect(prisma.libraryItem.create).not.toHaveBeenCalled();
  });

  it("throws AlreadyLikedError when track is already in library", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValueOnce(makeTrack() as never);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(makeLibraryItem() as never);

    await expect(likeTrack("user-1", "track-1")).rejects.toThrow(AlreadyLikedError);
    expect(prisma.libraryItem.create).not.toHaveBeenCalled();
  });

  it("does NOT create duplicate: checks removedAt=null to detect active likes", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValueOnce(makeTrack() as never);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.libraryItem.create).mockResolvedValueOnce({} as never);

    await likeTrack("user-1", "track-1");

    // Verify the duplicate check uses removedAt: null (only active likes count)
    expect(prisma.libraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          removedAt: null,
        }),
      }),
    );
  });
});

// ── unlikeTrack ───────────────────────────────────────────────────────────────

describe("library.service — unlikeTrack (soft-delete / append-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes by setting removedAt (NOT a hard delete)", async () => {
    vi.mocked(prisma.libraryItem.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    await unlikeTrack("user-1", "track-1");

    // Must use updateMany with removedAt set, NOT delete
    expect(prisma.libraryItem.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        trackId: "track-1",
        entityType: "TRACK",
        removedAt: null,
      },
      data: { removedAt: expect.any(Date) },
    });
  });

  it("does not throw when track was not liked (idempotent)", async () => {
    vi.mocked(prisma.libraryItem.updateMany).mockResolvedValueOnce({ count: 0 } as never);

    await expect(unlikeTrack("user-1", "never-liked")).resolves.not.toThrow();
  });
});

// ── isTrackLiked ──────────────────────────────────────────────────────────────

describe("library.service — isTrackLiked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when an active library item exists", async () => {
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(makeLibraryItem() as never);

    const result = await isTrackLiked("user-1", "track-1");
    expect(result).toBe(true);
  });

  it("returns false when no active library item exists", async () => {
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(null);

    const result = await isTrackLiked("user-1", "track-1");
    expect(result).toBe(false);
  });

  it("queries with removedAt=null to exclude soft-deleted items", async () => {
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValueOnce(null);

    await isTrackLiked("user-1", "track-1");

    expect(prisma.libraryItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          removedAt: null,
          userId: "user-1",
          trackId: "track-1",
          entityType: "TRACK",
        }),
      }),
    );
  });
});
