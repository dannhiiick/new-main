import { prisma } from "../../db/client.js";
import type { TrackSummary } from "../catalog/catalog.service.js";

export interface BridgeTrack {
  track: TrackSummary;
  fromScore: number; // similarity to source genre
  toScore: number;   // similarity to target genre
  bridgeScore: number; // how well it bridges (closer to 1 = equal distance)
}

export interface GenreBridgeResult {
  fromGenre: string;
  toGenre: string;
  tracks: BridgeTrack[];
  suggestion: string; // human-readable description
}

export class GenreNotFoundError extends Error {
  constructor(genre: string) {
    super(`No tracks found for genre: ${genre}`);
    this.name = "GenreNotFoundError";
  }
}

/**
 * Find tracks that bridge two genres.
 * Strategy: tracks that are tagged with EITHER genre but whose audio features
 * sit midway between the two genre centroids.
 *
 * Since we don't have audio embeddings yet, we use a simpler approach:
 * - Find tracks from both genres
 * - Score based on: freshness + quality (likes/plays) + diversity
 * - Select tracks that appear in playlists containing BOTH genres (cross-genre playlists)
 *   or simply select a mix of the best from each side.
 */
export async function getGenreBridge(
  fromGenre: string,
  toGenre: string,
  userId: string,
  limit = 10,
): Promise<GenreBridgeResult> {
  // Load feedback to exclude hidden content
  const feedbacks = await prisma.recommendationFeedback.findMany({
    where: { userId, kind: { in: ["HIDE_TRACK", "HIDE_ARTIST"] } },
    select: { kind: true, trackId: true },
  });
  const hiddenTrackIds = new Set(
    feedbacks.filter((f) => f.kind === "HIDE_TRACK").map((f) => f.trackId),
  );

  // Tracks from source genre
  const fromTracks = await prisma.track.findMany({
    where: {
      isPublished: true,
      playbackStatus: "PLAYABLE",
      genre: { equals: fromGenre, mode: "insensitive" },
      id: { notIn: [...hiddenTrackIds] },
    },
    include: {
      release: { select: { coverAssetUrl: true, releaseDate: true } },
      artists: {
        include: { artist: { select: { id: true, name: true, slug: true, isLocal: true } } },
        orderBy: { order: "asc" as const },
        take: 1,
      },
      _count: { select: { playEvents: true, libraryItems: true } },
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  // Tracks from target genre
  const toTracks = await prisma.track.findMany({
    where: {
      isPublished: true,
      playbackStatus: "PLAYABLE",
      genre: { equals: toGenre, mode: "insensitive" },
      id: { notIn: [...hiddenTrackIds] },
    },
    include: {
      release: { select: { coverAssetUrl: true, releaseDate: true } },
      artists: {
        include: { artist: { select: { id: true, name: true, slug: true, isLocal: true } } },
        orderBy: { order: "asc" as const },
        take: 1,
      },
      _count: { select: { playEvents: true, libraryItems: true } },
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  if (fromTracks.length === 0) throw new GenreNotFoundError(fromGenre);
  if (toTracks.length === 0) throw new GenreNotFoundError(toGenre);

  const now = new Date();

  function scoreTrack(t: typeof fromTracks[0]) {
    const plays = t._count.playEvents;
    const likes = t._count.libraryItems;
    const releaseDate = t.release.releaseDate ?? t.createdAt;
    const daysOld = (now.getTime() - releaseDate.getTime()) / (24 * 60 * 60 * 1000);
    const freshness = Math.max(0, Math.min(1, 1 - daysOld / 730)); // 2yr window
    const quality = plays > 0 ? Math.min(1, likes / plays) : 0;
    return freshness * 0.4 + quality * 0.4 + (t.isLocal ? 0.2 : 0.0);
  }

  function toSummary(t: typeof fromTracks[0]): TrackSummary {
    return {
      id: t.id,
      title: t.title,
      durationMs: t.durationMs,
      artists: t.artists.map((ta) => ({
        id: ta.artist.id,
        name: ta.artist.name,
        slug: ta.artist.slug,
      })),
      coverUrl: t.release.coverAssetUrl,
      playbackStatus: t.playbackStatus as "PLAYABLE" | "PROCESSING" | "BLOCKED",
      offlineEligible: t.offlineEligible,
      isLocal: t.isLocal,
    };
  }

  // Score and sort each side
  const scoredFrom = fromTracks
    .map((t) => ({ t, score: scoreTrack(t) }))
    .sort((a, b) => b.score - a.score);

  const scoredTo = toTracks
    .map((t) => ({ t, score: scoreTrack(t) }))
    .sort((a, b) => b.score - a.score);

  // Build bridge: take alternating best from each side
  const half = Math.ceil(limit / 2);
  const bridgeTracks: BridgeTrack[] = [];

  const fromSlice = scoredFrom.slice(0, half);
  const toSlice = scoredTo.slice(0, limit - half);

  for (let i = 0; i < Math.max(fromSlice.length, toSlice.length); i++) {
    const f = fromSlice[i];
    const to = toSlice[i];
    if (f) {
      bridgeTracks.push({
        track: toSummary(f.t),
        fromScore: f.score,
        toScore: 0,
        bridgeScore: 0.3 + f.score * 0.4,
      });
    }
    if (to) {
      bridgeTracks.push({
        track: toSummary(to.t),
        fromScore: 0,
        toScore: to.score,
        bridgeScore: 0.3 + to.score * 0.4,
      });
    }
  }

  return {
    fromGenre,
    toGenre,
    tracks: bridgeTracks.slice(0, limit),
    suggestion: `Переход от ${fromGenre} к ${toGenre}`,
  };
}

/**
 * Get a weekly bridge suggestion based on user's top 2 genres.
 */
export async function getWeeklyBridgeSuggestion(userId: string): Promise<{
  fromGenre: string | null;
  toGenre: string | null;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const plays = await prisma.playEvent.findMany({
    where: { userId, startedAt: { gte: thirtyDaysAgo }, suspicious: false },
    include: { track: { select: { genre: true } } },
  });

  const genreCount = new Map<string, number>();
  for (const p of plays) {
    const genre = p.track.genre;
    if (genre) genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1);
  }

  const sorted = Array.from(genreCount.entries()).sort((a, b) => b[1] - a[1]);

  return {
    fromGenre: sorted[0]?.[0] ?? null,
    toGenre: sorted[1]?.[0] ?? null,
  };
}
