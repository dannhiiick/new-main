import { describe, it, expect, vi, afterEach } from "vitest";

// ─── Mock prisma before importing the service ────────────────────────────────

vi.mock("../../db/client.js", () => ({
  prisma: {
    playlist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    playlistTrack: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../db/client.js";
import {
  listPlaylists,
  getPlaylistById,
  getPlaylistOwner,
  createPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
} from "./playlists.service.js";

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePlaylistRow(overrides: Partial<{
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  _count: { tracks: number };
}> = {}) {
  return {
    id: "playlist-1",
    title: "My Playlist",
    description: null,
    visibility: "PRIVATE",
    _count: { tracks: 3 },
    ...overrides,
  };
}

function makePlaylistDetail(overrides: Partial<{
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  userId: string;
  tracks: unknown[];
}> = {}) {
  return {
    id: "playlist-1",
    title: "My Playlist",
    description: null,
    visibility: "PRIVATE",
    userId: "user-1",
    tracks: [
      {
        id: "pt-1",
        trackId: "track-1",
        position: 1,
        track: {
          id: "track-1",
          title: "Test Track",
          durationMs: 210000,
          artists: [{ artist: { id: "artist-1", name: "Dimash" } }],
        },
      },
    ],
    ...overrides,
  };
}

// ─── listPlaylists ────────────────────────────────────────────────────────────

describe("listPlaylists", () => {
  it("returns empty page when user has no playlists", async () => {
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([]);

    const result = await listPlaylists("user-1", {});
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("returns playlists with correct shape", async () => {
    const row = makePlaylistRow();
    vi.mocked(prisma.playlist.findMany).mockResolvedValue([row] as never);

    const result = await listPlaylists("user-1", {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "playlist-1",
      title: "My Playlist",
      description: null,
      visibility: "PRIVATE",
      _count: { tracks: 3 },
    });
  });

  it("paginates: sets nextCursor when items exceed limit", async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      makePlaylistRow({ id: `pl-${i}` }),
    );
    vi.mocked(prisma.playlist.findMany).mockResolvedValue(rows as never);

    const result = await listPlaylists("user-1", { limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("pl-1");
  });

  it("returns null nextCursor when no more pages", async () => {
    const rows = [makePlaylistRow({ id: "pl-0" })];
    vi.mocked(prisma.playlist.findMany).mockResolvedValue(rows as never);

    const result = await listPlaylists("user-1", { limit: 20 });
    expect(result.nextCursor).toBeNull();
  });
});

// ─── getPlaylistById ──────────────────────────────────────────────────────────

describe("getPlaylistById", () => {
  it("returns null when playlist not found", async () => {
    vi.mocked(prisma.playlist.findUnique).mockResolvedValue(null);

    const result = await getPlaylistById("bad-id");
    expect(result).toBeNull();
  });

  it("returns playlist with mapped tracks", async () => {
    const detail = makePlaylistDetail();
    vi.mocked(prisma.playlist.findUnique).mockResolvedValue(detail as never);

    const result = await getPlaylistById("playlist-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("playlist-1");
    expect(result!.tracks).toHaveLength(1);
    expect(result!.tracks[0]).toMatchObject({
      id: "pt-1",
      trackId: "track-1",
      position: 1,
      track: {
        id: "track-1",
        title: "Test Track",
        duration: 210000,
        artists: [{ artist: { id: "artist-1", name: "Dimash" } }],
      },
    });
  });

  it("returns empty tracks array when playlist has no tracks", async () => {
    const detail = makePlaylistDetail({ tracks: [] });
    vi.mocked(prisma.playlist.findUnique).mockResolvedValue(detail as never);

    const result = await getPlaylistById("playlist-1");
    expect(result!.tracks).toHaveLength(0);
  });
});

// ─── getPlaylistOwner ─────────────────────────────────────────────────────────

describe("getPlaylistOwner", () => {
  it("returns userId when playlist exists", async () => {
    vi.mocked(prisma.playlist.findUnique).mockResolvedValue({
      userId: "user-1",
    } as never);

    const owner = await getPlaylistOwner("playlist-1");
    expect(owner).toBe("user-1");
  });

  it("returns null when playlist does not exist", async () => {
    vi.mocked(prisma.playlist.findUnique).mockResolvedValue(null);

    const owner = await getPlaylistOwner("bad-id");
    expect(owner).toBeNull();
  });
});

// ─── createPlaylist ───────────────────────────────────────────────────────────

describe("createPlaylist", () => {
  it("creates playlist and returns id", async () => {
    vi.mocked(prisma.playlist.create).mockResolvedValue({ id: "new-pl" } as never);

    const result = await createPlaylist("user-1", { title: "Workout Mix" });
    expect(result).toEqual({ id: "new-pl" });
    expect(prisma.playlist.create).toHaveBeenCalledOnce();
    expect(prisma.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", title: "Workout Mix" }),
      }),
    );
  });

  it("defaults description to null when not provided", async () => {
    vi.mocked(prisma.playlist.create).mockResolvedValue({ id: "new-pl" } as never);

    await createPlaylist("user-1", { title: "No Desc" });
    expect(prisma.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      }),
    );
  });

  it("passes description when provided", async () => {
    vi.mocked(prisma.playlist.create).mockResolvedValue({ id: "new-pl" } as never);

    await createPlaylist("user-1", { title: "Mix", description: "My desc" });
    expect(prisma.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: "My desc" }),
      }),
    );
  });
});

// ─── addTrackToPlaylist ───────────────────────────────────────────────────────

describe("addTrackToPlaylist", () => {
  it("appends at next position (max + 1)", async () => {
    vi.mocked(prisma.playlistTrack.aggregate).mockResolvedValue({
      _max: { position: 3 },
    } as never);
    vi.mocked(prisma.playlistTrack.create).mockResolvedValue({ id: "pt-new" } as never);

    const result = await addTrackToPlaylist("playlist-1", "track-2");
    expect(result).toEqual({ id: "pt-new" });
    expect(prisma.playlistTrack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 4 }),
      }),
    );
  });

  it("uses position 1 for first track (max is null)", async () => {
    vi.mocked(prisma.playlistTrack.aggregate).mockResolvedValue({
      _max: { position: null },
    } as never);
    vi.mocked(prisma.playlistTrack.create).mockResolvedValue({ id: "pt-1" } as never);

    await addTrackToPlaylist("playlist-1", "track-1");
    expect(prisma.playlistTrack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 1 }),
      }),
    );
  });
});

// ─── removeTrackFromPlaylist ──────────────────────────────────────────────────

describe("removeTrackFromPlaylist", () => {
  it("soft-deletes entry and returns true when found", async () => {
    vi.mocked(prisma.playlistTrack.findFirst).mockResolvedValue({
      id: "pt-1",
    } as never);
    vi.mocked(prisma.playlistTrack.update).mockResolvedValue({} as never);

    const result = await removeTrackFromPlaylist("playlist-1", "track-1");
    expect(result).toBe(true);
    expect(prisma.playlistTrack.update).toHaveBeenCalledOnce();
    expect(prisma.playlistTrack.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pt-1" },
        data: expect.objectContaining({ removedAt: expect.any(Date) }),
      }),
    );
  });

  it("returns false when entry not found (idempotent)", async () => {
    vi.mocked(prisma.playlistTrack.findFirst).mockResolvedValue(null);

    const result = await removeTrackFromPlaylist("playlist-1", "bad-track");
    expect(result).toBe(false);
    expect(prisma.playlistTrack.update).not.toHaveBeenCalled();
  });
});

// ─── deletePlaylist ───────────────────────────────────────────────────────────

describe("deletePlaylist", () => {
  it("calls prisma.playlist.delete with the playlist id", async () => {
    vi.mocked(prisma.playlist.delete).mockResolvedValue({} as never);

    await expect(deletePlaylist("playlist-1")).resolves.toBeUndefined();
    expect(prisma.playlist.delete).toHaveBeenCalledWith({ where: { id: "playlist-1" } });
  });
});
