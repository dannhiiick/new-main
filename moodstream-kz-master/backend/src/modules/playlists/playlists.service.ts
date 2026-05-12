import { prisma } from "../../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaylistListItem {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  _count: { tracks: number };
}

export interface PlaylistListPage {
  items: PlaylistListItem[];
  nextCursor: string | null;
}

export interface PlaylistTrackItem {
  id: string;
  trackId: string;
  position: number;
  track: {
    id: string;
    title: string;
    duration: number;
    artists: { artist: { id: string; name: string } }[];
  };
}

export interface PlaylistDetail {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  tracks: PlaylistTrackItem[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listPlaylists(
  userId: string,
  params: { cursor?: string; limit?: number },
): Promise<PlaylistListPage> {
  const limit = params.limit ?? 50;

  const playlists = await prisma.playlist.findMany({
    where: { userId },
    orderBy: { cursor: "desc" },
    take: limit + 1,
    ...(params.cursor != null ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      _count: {
        select: {
          tracks: { where: { removedAt: null } },
        },
      },
    },
  });

  const hasMore = playlists.length > limit;
  const items = hasMore ? playlists.slice(0, limit) : playlists;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last != null ? last.id : null;

  return {
    items: items.map((p: { id: string; title: string; description: string | null; visibility: string; _count: { tracks: number } }) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      visibility: p.visibility,
      _count: { tracks: p._count.tracks },
    })),
    nextCursor,
  };
}

export async function getPlaylistById(id: string): Promise<PlaylistDetail | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      userId: true,
      tracks: {
        where: { removedAt: null },
        orderBy: { position: "asc" },
        select: {
          id: true,
          trackId: true,
          position: true,
          track: {
            select: {
              id: true,
              title: true,
              durationMs: true,
              artists: {
                include: { artist: { select: { id: true, name: true } } },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!playlist) return null;

  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    visibility: playlist.visibility as string,
    tracks: playlist.tracks.map((pt: {
      id: string;
      trackId: string;
      position: number;
      track: {
        id: string;
        title: string;
        durationMs: number;
        artists: Array<{ artist: { id: string; name: string } }>;
      };
    }) => ({
      id: pt.id,
      trackId: pt.trackId,
      position: pt.position,
      track: {
        id: pt.track.id,
        title: pt.track.title,
        duration: pt.track.durationMs,
        artists: pt.track.artists.map((ta: { artist: { id: string; name: string } }) => ({
          artist: { id: ta.artist.id, name: ta.artist.name },
        })),
      },
    })),
  };
}

export async function getPlaylistOwner(id: string): Promise<string | null> {
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { userId: true },
  });
  return playlist?.userId ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createPlaylist(
  userId: string,
  data: { title: string; description?: string; visibility?: string },
): Promise<{ id: string }> {
  const playlist = await prisma.playlist.create({
    data: {
      userId,
      title: data.title,
      description: data.description !== undefined ? data.description : null,
      visibility: (data.visibility as never) ?? "PRIVATE",
    },
    select: { id: true },
  });
  return { id: playlist.id };
}

export async function addTrackToPlaylist(
  playlistId: string,
  trackId: string,
): Promise<{ id: string }> {
  // Get next position: max(position) + 1 among active tracks
  const agg = await prisma.playlistTrack.aggregate({
    where: { playlistId, removedAt: null },
    _max: { position: true },
  });
  const nextPosition = (agg._max.position ?? 0) + 1;

  const entry = await prisma.playlistTrack.create({
    data: { playlistId, trackId, position: nextPosition },
    select: { id: true },
  });
  return { id: entry.id };
}

export async function removeTrackFromPlaylist(
  playlistId: string,
  trackId: string,
): Promise<boolean> {
  // Soft-delete: set removedAt on the most recent active entry
  const entry = await prisma.playlistTrack.findFirst({
    where: { playlistId, trackId, removedAt: null },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  if (!entry) return false;

  await prisma.playlistTrack.update({
    where: { id: entry.id },
    data: { removedAt: new Date() },
  });
  return true;
}

export async function deletePlaylist(id: string): Promise<void> {
  await prisma.playlist.delete({ where: { id } });
}
