import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock prisma before importing the service ────────────────────────────────

vi.mock("../../db/client.js", () => ({
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

import { prisma } from "../../db/client.js";

afterEach(() => {
  vi.clearAllMocks();
});
import {
  getLikedTracks,
  likeTrack,
  unlikeTrack,
  isTrackLiked,
  TrackNotFoundError,
  AlreadyLikedError,
} from "./library.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLibraryItem(overrides: Partial<{
  id: string;
  userId: string;
  trackId: string;
  entityType: string;
  removedAt: Date | null;
  cursor: bigint;
  track: {
    id: string;
    title: string;
    durationMs: number;
    playbackStatus: string;
    offlineEligible: boolean;
    isLocal: boolean;
    release: { coverAssetUrl: string | null };
    artists: { artist: { id: string; name: string; slug: string } }[];
  };
}> = {}) {
  return {
    id: "item-1",
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
      isLocal: true,
      release: { coverAssetUrl: "https://cdn.example.com/cover.jpg" },
      artists: [{ artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" } }],
    },
    ...overrides,
  };
}

// ─── getLikedTracks ───────────────────────────────────────────────────────────

describe("getLikedTracks", () => {
  beforeEach(() => {
    vi.mocked(prisma.libraryItem.findMany).mockResolvedValue([]);
  });

  it("returns empty page when no liked tracks", async () => {
    const result = await getLikedTracks("user-1", undefined, 20);
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("returns tracks with correct shape", async () => {
    const item = makeLibraryItem();
    vi.mocked(prisma.libraryItem.findMany).mockResolvedValue([item] as never);

    const result = await getLikedTracks("user-1", undefined, 20);
    expect(result.items).toHaveLength(1);
    const track = result.items[0];
    expect(track).toMatchObject({
      id: "track-1",
      title: "Test Track",
      durationMs: 180000,
      playbackStatus: "PLAYABLE",
      offlineEligible: true,
      isLocal: true,
      coverUrl: "https://cdn.example.com/cover.jpg",
      artists: [{ id: "artist-1", name: "Test Artist", slug: "test-artist" }],
    });
  });

  it("paginates: returns nextCursor when there are more items than limit", async () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      makeLibraryItem({ id: `item-${i}`, trackId: `track-${i}` }),
    );
    vi.mocked(prisma.libraryItem.findMany).mockResolvedValue(items as never);

    const result = await getLikedTracks("user-1", undefined, 2);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("item-1"); // last item of the slice
  });

  it("returns null nextCursor when no more pages", async () => {
    const items = [makeLibraryItem({ id: "item-0" })];
    vi.mocked(prisma.libraryItem.findMany).mockResolvedValue(items as never);

    const result = await getLikedTracks("user-1", undefined, 20);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it("skips items with null track (safety: gracefully handles DB inconsistency)", async () => {
    const itemWithNullTrack = makeLibraryItem({ track: undefined as never });
    vi.mocked(prisma.libraryItem.findMany).mockResolvedValue([itemWithNullTrack] as never);

    const result = await getLikedTracks("user-1", undefined, 20);
    expect(result.items).toHaveLength(0);
  });
});

// ─── likeTrack ────────────────────────────────────────────────────────────────

describe("likeTrack", () => {
  beforeEach(() => {
    vi.mocked(prisma.track.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.libraryItem.create).mockResolvedValue({} as never);
  });

  it("creates a library item when track exists and not already liked", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValue({ id: "track-1" } as never);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValue(null);

    await expect(likeTrack("user-1", "track-1")).resolves.toBeUndefined();
    expect(prisma.libraryItem.create).toHaveBeenCalledOnce();
    expect(prisma.libraryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", trackId: "track-1" }),
      }),
    );
  });

  it("throws TrackNotFoundError when track does not exist", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValue(null);

    await expect(likeTrack("user-1", "bad-track")).rejects.toThrow(TrackNotFoundError);
    expect(prisma.libraryItem.create).not.toHaveBeenCalled();
  });

  it("throws AlreadyLikedError when track is already liked", async () => {
    vi.mocked(prisma.track.findUnique).mockResolvedValue({ id: "track-1" } as never);
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValue(
      makeLibraryItem() as never,
    );

    await expect(likeTrack("user-1", "track-1")).rejects.toThrow(AlreadyLikedError);
    expect(prisma.libraryItem.create).not.toHaveBeenCalled();
  });

  it("TrackNotFoundError has correct name", () => {
    const e = new TrackNotFoundError();
    expect(e.name).toBe("TrackNotFoundError");
    expect(e).toBeInstanceOf(Error);
  });

  it("AlreadyLikedError has correct name", () => {
    const e = new AlreadyLikedError();
    expect(e.name).toBe("AlreadyLikedError");
    expect(e).toBeInstanceOf(Error);
  });
});

// ─── unlikeTrack ─────────────────────────────────────────────────────────────

describe("unlikeTrack", () => {
  beforeEach(() => {
    vi.mocked(prisma.libraryItem.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("soft-deletes the library item by setting removedAt", async () => {
    await expect(unlikeTrack("user-1", "track-1")).resolves.toBeUndefined();

    expect(prisma.libraryItem.updateMany).toHaveBeenCalledOnce();
    expect(prisma.libraryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", trackId: "track-1", removedAt: null }),
        data: expect.objectContaining({ removedAt: expect.any(Date) }),
      }),
    );
  });

  it("does not throw if track was not liked (idempotent)", async () => {
    vi.mocked(prisma.libraryItem.updateMany).mockResolvedValue({ count: 0 } as never);
    await expect(unlikeTrack("user-1", "non-liked-track")).resolves.toBeUndefined();
  });
});

// ─── isTrackLiked ─────────────────────────────────────────────────────────────

describe("isTrackLiked", () => {
  it("returns true when library item exists", async () => {
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValue(
      makeLibraryItem() as never,
    );
    const result = await isTrackLiked("user-1", "track-1");
    expect(result).toBe(true);
  });

  it("returns false when library item does not exist", async () => {
    vi.mocked(prisma.libraryItem.findFirst).mockResolvedValue(null);
    const result = await isTrackLiked("user-1", "track-1");
    expect(result).toBe(false);
  });
});
