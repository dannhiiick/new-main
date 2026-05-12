import { prisma } from "../../db/client.js";

export interface GenreNode {
  genre: string;
  playCount: number;
  likeCount: number;
  /** 0–1: relative weight vs other genres in this profile */
  weight: number;
  /** 0–1: ratio of liked to played */
  affinityScore: number;
  isLocal: boolean;
}

export interface TasteMapResult {
  genres: GenreNode[];
  totalPlays: number;
  topGenre: string | null;
  updatedAt: string;
}

export async function getTasteMap(userId: string): Promise<TasteMapResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Plays per genre in last 30 days
  const playEvents = await prisma.playEvent.findMany({
    where: {
      userId,
      startedAt: { gte: thirtyDaysAgo },
      suspicious: false,
    },
    include: {
      track: {
        select: {
          genre: true,
          isLocal: true,
          artists: {
            include: { artist: { select: { isLocal: true } } },
            take: 1,
          },
        },
      },
    },
  });

  // Liked tracks with genre
  const likedItems = await prisma.libraryItem.findMany({
    where: { userId, entityType: "TRACK", removedAt: null },
    include: {
      track: {
        select: {
          genre: true,
          isLocal: true,
        },
      },
    },
  });

  // Aggregate by genre
  const playMap = new Map<string, { plays: number; isLocal: boolean }>();
  for (const event of playEvents) {
    const genre = event.track.genre ?? "other";
    const isLocal = event.track.isLocal || (event.track.artists[0]?.artist.isLocal ?? false);
    const cur = playMap.get(genre) ?? { plays: 0, isLocal };
    playMap.set(genre, { plays: cur.plays + 1, isLocal });
  }

  const likeMap = new Map<string, number>();
  for (const item of likedItems) {
    if (!item.track) continue;
    const genre = item.track.genre ?? "other";
    likeMap.set(genre, (likeMap.get(genre) ?? 0) + 1);
  }

  const totalPlays = playEvents.length;

  const genres: GenreNode[] = Array.from(playMap.entries())
    .map(([genre, { plays, isLocal }]) => {
      const likes = likeMap.get(genre) ?? 0;
      return {
        genre,
        playCount: plays,
        likeCount: likes,
        weight: totalPlays > 0 ? plays / totalPlays : 0,
        affinityScore: plays > 0 ? Math.min(1, likes / plays) : 0,
        isLocal,
      };
    })
    .sort((a, b) => b.playCount - a.playCount);

  // Also add genres from liked tracks that may not have play events
  for (const item of likedItems) {
    if (!item.track) continue;
    const genre = item.track.genre ?? "other";
    if (!playMap.has(genre)) {
      genres.push({
        genre,
        playCount: 0,
        likeCount: likeMap.get(genre) ?? 0,
        weight: 0,
        affinityScore: 0,
        isLocal: item.track.isLocal,
      });
    }
  }

  const topGenre = genres[0]?.genre ?? null;

  return {
    genres: genres.slice(0, 20), // top 20 genres
    totalPlays,
    topGenre,
    updatedAt: new Date().toISOString(),
  };
}
