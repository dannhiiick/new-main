import { prisma } from "../../db/client.js";
import type { CursorPage } from "../../domain/types.js";
import type { TrackSummary } from "../catalog/catalog.service.js";

const TRACK_INCLUDE = {
  release: { select: { coverAssetUrl: true } },
  artists: {
    include: { artist: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: "asc" as const },
  },
} as const;

type TrackWithRelations = {
  id: string;
  title: string;
  durationMs: number;
  playbackStatus: string;
  offlineEligible: boolean;
  isLocal: boolean;
  release: { coverAssetUrl: string | null };
  artists: { artist: { id: string; name: string; slug: string } }[];
};

function buildTrackSummary(track: TrackWithRelations): TrackSummary {
  const status = track.playbackStatus as "PLAYABLE" | "PROCESSING" | "BLOCKED";
  return {
    id: track.id,
    title: track.title,
    durationMs: track.durationMs,
    artists: track.artists.map((ta) => ({
      id: ta.artist.id,
      name: ta.artist.name,
      slug: ta.artist.slug,
    })),
    coverUrl: track.release.coverAssetUrl,
    playbackStatus: status,
    offlineEligible: track.offlineEligible,
    isLocal: track.isLocal,
  };
}

export class TrackNotFoundError extends Error {
  constructor() {
    super("Track not found or not available");
    this.name = "TrackNotFoundError";
  }
}

export class AlreadyLikedError extends Error {
  constructor() {
    super("Track is already in library");
    this.name = "AlreadyLikedError";
  }
}

export async function getLikedTracks(
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<CursorPage<TrackSummary>> {
  const items = await prisma.libraryItem.findMany({
    where: {
      userId,
      entityType: "TRACK",
      removedAt: null,
      track: {
        isPublished: true,
        playbackStatus: "PLAYABLE",
      },
    },
    orderBy: { cursor: "desc" },
    take: limit + 1,
    ...(cursor != null ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      track: {
        include: TRACK_INCLUDE,
      },
    },
  });

  const hasMore = items.length > limit;
  const sliced = hasMore ? items.slice(0, limit) : items;
  const lastItem = sliced[sliced.length - 1];
  const nextCursor = hasMore && lastItem != null ? lastItem.id : null;

  const tracks: TrackSummary[] = sliced.flatMap((item) => {
    if (item.track == null) return [];
    return [buildTrackSummary(item.track)];
  });

  return { items: tracks, nextCursor };
}

export async function likeTrack(
  userId: string,
  trackId: string,
): Promise<void> {
  const track = await prisma.track.findUnique({
    where: { id: trackId, isPublished: true, playbackStatus: "PLAYABLE" },
    select: { id: true },
  });

  if (track == null) {
    throw new TrackNotFoundError();
  }

  // Check if already liked (and not removed)
  const existing = await prisma.libraryItem.findFirst({
    where: { userId, trackId, entityType: "TRACK", removedAt: null },
  });

  if (existing != null) {
    throw new AlreadyLikedError();
  }

  await prisma.libraryItem.create({
    data: {
      userId,
      entityType: "TRACK",
      trackId,
    },
  });
}

export async function unlikeTrack(
  userId: string,
  trackId: string,
): Promise<void> {
  await prisma.libraryItem.updateMany({
    where: {
      userId,
      trackId,
      entityType: "TRACK",
      removedAt: null,
    },
    data: { removedAt: new Date() },
  });
}

export interface HistoryItem {
  playedAt: string;
  track: TrackSummary;
}

export async function getListeningHistory(
  userId: string,
  cursor: string | undefined,
  limit: number,
): Promise<{ items: HistoryItem[]; nextCursor: string | null }> {
  const events = await prisma.playEvent.findMany({
    where: { userId, suspicious: false, action: "START" },
    orderBy: { startedAt: "desc" },
    take: limit + 1,
    ...(cursor != null ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      startedAt: true,
      track: { include: TRACK_INCLUDE },
    },
  });

  const hasMore = events.length > limit;
  const sliced = hasMore ? events.slice(0, limit) : events;
  const lastItem = sliced[sliced.length - 1];
  const nextCursor = hasMore && lastItem != null ? lastItem.id : null;

  const items: HistoryItem[] = sliced.flatMap((e) => {
    if (!e.track) return [];
    return [{ playedAt: e.startedAt.toISOString(), track: buildTrackSummary(e.track) }];
  });

  return { items, nextCursor };
}

export async function isTrackLiked(
  userId: string,
  trackId: string,
): Promise<boolean> {
  const item = await prisma.libraryItem.findFirst({
    where: {
      userId,
      trackId,
      entityType: "TRACK",
      removedAt: null,
    },
    select: { id: true },
  });
  return item != null;
}
