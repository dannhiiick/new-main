import { prisma } from "../../db/client.js";
import type { TrackSummary } from "../catalog/catalog.service.js";
import type { UserRecommendationProfile } from "@prisma/client";
import { formatVector } from "../../utils/embeddings.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReasonType =
  | "ARTIST_AFFINITY"
  | "GENRE_MATCH"
  | "ACOUSTIC_MATCH"
  | "KAZAKH_BOOST"
  | "CHART_MOMENTUM"
  | "FRESHNESS"
  | "QUALITY_SIGNAL"
  | "SESSION_CONTEXT"
  | "EXPLORATION";

export interface ReasonItem {
  type: ReasonType;
  label: string;
  weight: number;
}

export interface ScoredTrack {
  trackId: string;
  score: number;
  reasons: ReasonItem[];
  track: TrackSummary;
}

export interface RecommendationsResult {
  tracks: ScoredTrack[];
  profile: UserRecommendationProfile;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CANDIDATES = 300;
const FATIGUE_WINDOW_DAYS = 7;
const FRESHNESS_WINDOW_DAYS = 30;
const ARTIST_PLAY_WINDOW_DAYS = 30;
const ARTIST_PLAY_SCALE = 10;
const MAX_TRACKS_PER_ARTIST = 2;         // diversity cap
const MAX_TRACKS_PER_GENRE = 3;          // genre diversity cap in final result
const EXPLORATION_RATIO = 0.15;          // 15% results from new artists
const SKIP_PENALTY_THRESHOLD = 0.2;      // completion < 20% = skip
const QUALITY_SIGNAL_WEIGHT = 0.15;      // fixed — quality is universal
const SESSION_BOOST_WEIGHT = 0.20;       // fixed — context is universal
const TIME_DECAY_HALFLIFE_DAYS = 7;      // artist affinity decays over time
const COLD_START_PLAY_THRESHOLD = 5;     // below this = cold start mode
const COLD_START_LIKE_THRESHOLD = 3;

const TRACK_INCLUDE = {
  release: { select: { coverAssetUrl: true, releaseDate: true } },
  artists: {
    include: {
      artist: {
        select: { id: true, name: true, slug: true, isLocal: true },
      },
    },
    orderBy: { order: "asc" as const },
  },
} as const;

type CandidateTrack = {
  id: string;
  title: string;
  durationMs: number;
  playbackStatus: string;
  offlineEligible: boolean;
  isLocal: boolean;
  genre: string | null;
  createdAt: Date;
  release: { coverAssetUrl: string | null; releaseDate: Date | null };
  artists: {
    artist: {
      id: string;
      name: string;
      slug: string;
      isLocal: boolean;
    };
  }[];
};

type AudioFeatures = {
  bpm: number | null;
  energy: number | null;
  valence: number | null;
  danceability: number | null;
  acousticness: number | null;
};

function toSummary(t: CandidateTrack): TrackSummary {
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

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getOrCreateProfile(
  userId: string,
): Promise<UserRecommendationProfile> {
  const existing = await prisma.userRecommendationProfile.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  return prisma.userRecommendationProfile.create({
    data: { userId },
  });
}

export type ProfileWeights = {
  weightArtist?: number;
  weightGenre?: number;
  weightAcoustic?: number;
  weightKazakh?: number;
  weightChart?: number;
  weightFreshness?: number;
};

export async function updateProfile(
  userId: string,
  weights: ProfileWeights,
): Promise<UserRecommendationProfile> {
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    if (v !== undefined) clean[k] = v;
  }
  return prisma.userRecommendationProfile.upsert({
    where: { userId },
    create: { userId, ...clean },
    update: clean,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Time-decayed artist affinity: recent listens weigh more.
 * Uses exponential decay with a 7-day half-life.
 */
function computeDecayedAffinity(
  events: { trackId: string; startedAt: Date }[],
  artistTrackIds: Set<string>,
  now: Date,
): number {
  let decayed = 0;
  for (const e of events) {
    if (!artistTrackIds.has(e.trackId)) continue;
    const daysAgo = (now.getTime() - e.startedAt.getTime()) / (24 * 60 * 60 * 1000);
    decayed += Math.pow(0.5, daysAgo / TIME_DECAY_HALFLIFE_DAYS);
  }
  return Math.min(decayed / ARTIST_PLAY_SCALE, 1.0);
}

/**
 * Acoustic similarity between user's preference vector and a track's features.
 * Uses cosine-like distance on [energy, valence, danceability, acousticness].
 */
function acousticSimilarity(
  userVec: AudioFeatures,
  trackFeatures: AudioFeatures | null,
): number {
  if (!trackFeatures) return 0;

  const dims: (keyof AudioFeatures)[] = ["energy", "valence", "danceability", "acousticness"];
  let sumSq = 0;
  let count = 0;

  for (const dim of dims) {
    const u = userVec[dim];
    const t = trackFeatures[dim];
    if (u !== null && t !== null) {
      sumSq += Math.pow(u - t, 2);
      count++;
    }
  }
  if (count === 0) return 0;

  // Euclidean distance in [0, sqrt(count)], convert to similarity [0, 1]
  const distance = Math.sqrt(sumSq / count);
  return Math.max(0, 1 - distance);
}

/**
 * Determine hour-of-day bias: morning → high energy, night → low valence.
 * Returns { energyBias: number, valenceBias: number } in [-0.3, +0.3].
 */
function timeOfDayBias(now: Date): { energyBias: number; valenceBias: number } {
  const hour = now.getUTCHours(); // use UTC; client timezone not tracked yet
  if (hour >= 5 && hour < 11) return { energyBias: 0.2, valenceBias: 0.1 };   // morning
  if (hour >= 11 && hour < 17) return { energyBias: 0.1, valenceBias: 0.0 };  // day
  if (hour >= 17 && hour < 22) return { energyBias: 0.0, valenceBias: 0.1 };  // evening
  return { energyBias: -0.2, valenceBias: -0.1 };                              // night
}

function pluralizeDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

export async function getRecommendations(
  userId: string,
  limit: number = 20,
): Promise<RecommendationsResult> {
  const profile = await getOrCreateProfile(userId);
  const now = new Date();

  const thirtyDaysAgo = new Date(now.getTime() - ARTIST_PLAY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const sevenDaysAgo  = new Date(now.getTime() - FATIGUE_WINDOW_DAYS   * 24 * 60 * 60 * 1000);

  // ── 1. Load all user context in parallel ──────────────────────────────────
  // ── 0. Cold start detection ───────────────────────────────────────────────
  // Detect before loading full context — used to tune scoring below
  const [coldStartPlays, coldStartLikes] = await Promise.all([
    prisma.playEvent.count({ where: { userId, suspicious: false } }),
    prisma.libraryItem.count({ where: { userId, entityType: "TRACK", removedAt: null } }),
  ]);
  const isColdStart =
    coldStartPlays < COLD_START_PLAY_THRESHOLD &&
    coldStartLikes < COLD_START_LIKE_THRESHOLD;

  const [feedbacks, likedItems, recentPlays, kzChart] = await Promise.all([
    prisma.recommendationFeedback.findMany({
      where: { userId, kind: { in: ["HIDE_TRACK", "HIDE_ARTIST", "DISLIKE"] } },
      select: { kind: true, trackId: true },
    }),
    prisma.libraryItem.findMany({
      where: { userId, entityType: "TRACK", removedAt: null },
      select: { trackId: true },
    }),
    // Include action (SKIP/COMPLETE) for quality signal
    prisma.playEvent.findMany({
      where: { userId, startedAt: { gte: thirtyDaysAgo }, suspicious: false },
      select: { trackId: true, startedAt: true, completionPct: true, action: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.chartEntry.findMany({
      where: {
        chart: { slug: "top-kz", isPublished: true },
        position: { lte: 50 },
      },
      select: { trackId: true, position: true },
      orderBy: { position: "asc" },
    }),
  ]);

  // ── 2. Build lookup structures ────────────────────────────────────────────

  // Hidden / disliked tracks
  const hiddenTrackIds = new Set(
    feedbacks
      .filter((f) => f.kind === "HIDE_TRACK" || f.kind === "DISLIKE")
      .map((f) => f.trackId),
  );

  // Hidden artists
  const hiddenArtistSourceTrackIds = feedbacks
    .filter((f) => f.kind === "HIDE_ARTIST")
    .map((f) => f.trackId);

  const hiddenArtistIds = new Set<string>();
  if (hiddenArtistSourceTrackIds.length > 0) {
    const tas = await prisma.trackArtist.findMany({
      where: { trackId: { in: hiddenArtistSourceTrackIds } },
      select: { artistId: true },
    });
    for (const ta of tas) hiddenArtistIds.add(ta.artistId);
  }

  // Liked tracks
  const likedTrackIds = new Set(
    likedItems.map((i) => i.trackId).filter((id): id is string => id !== null),
  );

  // Fatigue (played in last 7 days)
  const fatiguedTrackIds = new Set(
    recentPlays
      .filter((pe) => pe.startedAt >= sevenDaysAgo)
      .map((pe) => pe.trackId),
  );

  // Skip penalty: tracks the user skips often (completion < 20%)
  const skipCounts = new Map<string, number>();
  const playCounts = new Map<string, number>();
  for (const pe of recentPlays) {
    playCounts.set(pe.trackId, (playCounts.get(pe.trackId) ?? 0) + 1);
    if ((pe.completionPct ?? 100) < SKIP_PENALTY_THRESHOLD * 100) {
      skipCounts.set(pe.trackId, (skipCounts.get(pe.trackId) ?? 0) + 1);
    }
  }
  // Skip rate per track (0-1)
  const skipRateMap = new Map<string, number>();
  for (const [trackId, plays] of playCounts) {
    const skips = skipCounts.get(trackId) ?? 0;
    skipRateMap.set(trackId, skips / plays);
  }

  // Average completion per track (quality signal)
  const completionSums = new Map<string, number>();
  const completionCounts = new Map<string, number>();
  for (const pe of recentPlays) {
    if (pe.completionPct !== null) {
      completionSums.set(pe.trackId, (completionSums.get(pe.trackId) ?? 0) + pe.completionPct);
      completionCounts.set(pe.trackId, (completionCounts.get(pe.trackId) ?? 0) + 1);
    }
  }
  const avgCompletionMap = new Map<string, number>();
  for (const [trackId, sum] of completionSums) {
    const cnt = completionCounts.get(trackId) ?? 1;
    avgCompletionMap.set(trackId, sum / cnt / 100); // 0-1
  }

  // ── Session context: last 3 tracks played ────────────────────────────────
  const lastThreePlayed = [...new Set(recentPlays.map((pe) => pe.trackId))].slice(0, 3);
  const sessionArtistIds = new Set<string>();
  const sessionGenres = new Set<string>();

  if (lastThreePlayed.length > 0) {
    const sessionTracks = await prisma.track.findMany({
      where: { id: { in: lastThreePlayed } },
      select: {
        genre: true,
        artists: { select: { artistId: true }, take: 1 },
      },
    });
    for (const st of sessionTracks) {
      if (st.genre) sessionGenres.add(st.genre.toLowerCase());
      for (const ta of st.artists) sessionArtistIds.add(ta.artistId);
    }
  }

  // ── Artist affinity (time-decayed) ────────────────────────────────────────
  const recentlyPlayedTrackIds = [...new Set(recentPlays.map((pe) => pe.trackId))];
  const artistToTrackIds = new Map<string, Set<string>>();

  if (recentlyPlayedTrackIds.length > 0) {
    const playedTrackArtists = await prisma.trackArtist.findMany({
      where: { trackId: { in: recentlyPlayedTrackIds } },
      select: { trackId: true, artistId: true },
    });
    for (const ta of playedTrackArtists) {
      if (!artistToTrackIds.has(ta.artistId)) {
        artistToTrackIds.set(ta.artistId, new Set());
      }
      artistToTrackIds.get(ta.artistId)!.add(ta.trackId);
    }
  }

  // ── Genre affinity: top-3 genres from liked + played tracks ──────────────
  const genreAffinityMap = new Map<string, number>();
  const genreSourceTrackIds = [...likedTrackIds, ...recentlyPlayedTrackIds].slice(0, 100);
  if (genreSourceTrackIds.length > 0) {
    const genreTracks = await prisma.track.findMany({
      where: { id: { in: genreSourceTrackIds }, genre: { not: null } },
      select: { genre: true },
    });
    for (const t of genreTracks) {
      if (t.genre) {
        genreAffinityMap.set(t.genre, (genreAffinityMap.get(t.genre) ?? 0) + 1);
      }
    }
  }
  // Normalize to [0, 1]
  const maxGenreCount = Math.max(...genreAffinityMap.values(), 1);
  for (const [g, cnt] of genreAffinityMap) {
    genreAffinityMap.set(g, cnt / maxGenreCount);
  }

  // ── Acoustic preference vector (average over liked tracks with features) ──
  let userAcousticVec: AudioFeatures = {
    bpm: null, energy: null, valence: null, danceability: null, acousticness: null,
  };
  if (likedTrackIds.size > 0) {
    const likedFeatures = await prisma.trackAudioFeatures.findMany({
      where: { trackId: { in: [...likedTrackIds] } },
      select: { energy: true, valence: true, danceability: true, acousticness: true, bpm: true },
    });
    if (likedFeatures.length > 0) {
      const dims: (keyof AudioFeatures)[] = ["energy", "valence", "danceability", "acousticness", "bpm"];
      for (const dim of dims) {
        const vals = likedFeatures.map((f) => f[dim]).filter((v): v is number => v !== null);
        if (vals.length > 0) {
          (userAcousticVec as Record<string, number | null>)[dim] =
            vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      }
    }
  }

  // Apply time-of-day bias to acoustic preference
  const bias = timeOfDayBias(now);
  if (userAcousticVec.energy !== null) {
    userAcousticVec = {
      ...userAcousticVec,
      energy: Math.min(1, Math.max(0, userAcousticVec.energy + bias.energyBias)),
      valence: userAcousticVec.valence !== null
        ? Math.min(1, Math.max(0, userAcousticVec.valence + bias.valenceBias))
        : null,
    };
  }

  // ── Liked artist IDs ──────────────────────────────────────────────────────
  let likedArtistIds: string[] = [];
  if (likedTrackIds.size > 0) {
    const tas = await prisma.trackArtist.findMany({
      where: { trackId: { in: [...likedTrackIds] } },
      select: { artistId: true },
    });
    likedArtistIds = [...new Set(tas.map((ta) => ta.artistId))].filter(
      (id) => !hiddenArtistIds.has(id),
    );
  }

  // ── Artists user has NEVER heard (for exploration) ────────────────────────
  const heardArtistIds = new Set([...artistToTrackIds.keys(), ...likedArtistIds]);

  // Chart lookup
  const chartPositionMap = new Map<string, number>(
    kzChart.map((e) => [e.trackId, e.position]),
  );

  const excludeTrackIds = [...hiddenTrackIds, ...likedTrackIds];

  const candidateWhere = {
    isPublished: true,
    playbackStatus: "PLAYABLE" as const,
    ...(excludeTrackIds.length > 0 ? { id: { notIn: excludeTrackIds } } : {}),
    ...(hiddenArtistIds.size > 0
      ? { artists: { none: { artistId: { in: [...hiddenArtistIds] } } } }
      : {}),
  };

  // ── 3. Fetch candidates ───────────────────────────────────────────────────
  const [artistCandidates, recentCandidates, chartCandidates, explorationCandidates] =
    await Promise.all([
      // Tracks by liked / played artists
      likedArtistIds.length > 0
        ? prisma.track.findMany({
            where: {
              ...candidateWhere,
              artists: { some: { artistId: { in: likedArtistIds } } },
            },
            include: TRACK_INCLUDE,
            take: 100,
          })
        : Promise.resolve([] as CandidateTrack[]),

      // Recently published
      prisma.track.findMany({
        where: candidateWhere,
        include: TRACK_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),

      // Chart tracks
      kzChart.length > 0
        ? prisma.track.findMany({
            where: {
              ...candidateWhere,
              id: { in: kzChart.map((e) => e.trackId) },
            },
            include: TRACK_INCLUDE,
            take: 50,
          })
        : Promise.resolve([] as CandidateTrack[]),

      // Exploration: tracks from artists user has NEVER played
      // Cold start: heardArtistIds is empty so filter has no effect — still fetch diverse tracks
      prisma.track.findMany({
        where: {
          ...candidateWhere,
          ...(heardArtistIds.size > 0
            ? { artists: { none: { artistId: { in: [...heardArtistIds] } } } }
            : {}),
        },
        include: TRACK_INCLUDE,
        orderBy: isColdStart
          ? [{ isLocal: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }],
        take: isColdStart ? 80 : 40,
      }),
    ]);

  // Deduplicate, limit MAX_CANDIDATES
  const seen = new Set<string>();
  const candidates: CandidateTrack[] = [];
  for (const t of [
    ...artistCandidates,
    ...recentCandidates,
    ...chartCandidates,
    ...explorationCandidates,
  ]) {
    if (!seen.has(t.id) && candidates.length < MAX_CANDIDATES) {
      seen.add(t.id);
      candidates.push(t as CandidateTrack);
    }
  }

  // Load audio features for all candidates in one query
  const audioFeaturesMap = new Map<string, AudioFeatures>();
  if (candidates.length > 0) {
    const features = await prisma.trackAudioFeatures.findMany({
      where: { trackId: { in: candidates.map((c) => c.id) } },
      select: {
        trackId: true,
        bpm: true,
        energy: true,
        valence: true,
        danceability: true,
        acousticness: true,
      },
    });
    for (const f of features) {
      audioFeaturesMap.set(f.trackId, {
        bpm: f.bpm,
        energy: f.energy,
        valence: f.valence,
        danceability: f.danceability,
        acousticness: f.acousticness,
      });
    }
  }

  // ── 3a. Vector similarity: build user preference embedding from liked tracks ─
  // Average the embeddings of liked tracks → user taste vector
  // Then score candidates by cosine distance (via pgvector)
  const vectorSimilarityMap = new Map<string, number>();

  if (likedTrackIds.size > 0 && candidates.length > 0) {
    try {
      type EmbeddingRow = { trackId: string; embedding: string | null };
      const likedEmbeddings = await prisma.$queryRaw<EmbeddingRow[]>`
        SELECT "trackId", "embedding"::text
        FROM track_audio_features
        WHERE "trackId" = ANY(${[...likedTrackIds]}::text[])
          AND "embedding" IS NOT NULL
      `;

      if (likedEmbeddings.length > 0) {
        // Parse and average embeddings to build user taste vector
        const vectors = likedEmbeddings
          .map((r) => {
            if (!r.embedding) return null;
            const nums = r.embedding.replace(/[\[\]]/g, "").split(",").map(Number);
            return nums.length === 512 ? nums : null;
          })
          .filter((v): v is number[] => v !== null);

        if (vectors.length > 0) {
          const userVec = new Array<number>(512).fill(0);
          for (const v of vectors) {
            for (let i = 0; i < 512; i++) userVec[i]! += v[i]!;
          }
          for (let i = 0; i < 512; i++) userVec[i]! /= vectors.length;

          // Query top-N candidates by cosine similarity to user vector
          const candidateIds = candidates.map((c) => c.id);
          type SimRow = { trackId: string; similarity: number };
          const simRows = await prisma.$queryRaw<SimRow[]>`
            SELECT "trackId",
                   1 - ("embedding" <=> ${formatVector(userVec)}::vector) AS similarity
            FROM track_audio_features
            WHERE "trackId" = ANY(${candidateIds}::text[])
              AND "embedding" IS NOT NULL
            ORDER BY "embedding" <=> ${formatVector(userVec)}::vector
            LIMIT 100
          `;
          for (const row of simRows) {
            vectorSimilarityMap.set(row.trackId, Number(row.similarity));
          }
        }
      }
    } catch {
      // pgvector not available or no embeddings yet — silently skip
    }
  }

  // ── 3b. Global popularity signal (all users, not just personal) ──────────
  // Used in cold start to surface genuinely popular tracks
  const globalPopularityMap = new Map<string, number>();
  if (isColdStart && candidates.length > 0) {
    const globalPlays = await prisma.playEvent.groupBy({
      by: ["trackId"],
      where: { trackId: { in: candidates.map((c) => c.id) }, suspicious: false },
      _count: { trackId: true },
      _avg: { completionPct: true },
    });
    const maxPlays = Math.max(...globalPlays.map((g) => g._count.trackId), 1);
    for (const g of globalPlays) {
      const playScore = g._count.trackId / maxPlays;
      const completionScore = (g._avg.completionPct ?? 0) / 100;
      globalPopularityMap.set(g.trackId, playScore * 0.5 + completionScore * 0.5);
    }
  }

  // ── 4. Score candidates ───────────────────────────────────────────────────
  const explorationTrackIds = new Set(explorationCandidates.map((t) => t.id));
  const scored: ScoredTrack[] = [];

  for (const track of candidates) {
    if (hiddenTrackIds.has(track.id)) continue;
    if (track.artists.some((ta) => hiddenArtistIds.has(ta.artist.id))) continue;

    const reasons: ReasonItem[] = [];
    let score = 0;

    const trackArtistIds = track.artists.map((ta) => ta.artist.id);

    // 1. Artist affinity (time-decayed)
    let maxAffinity = 0;
    for (const artistId of trackArtistIds) {
      const trackIds = artistToTrackIds.get(artistId);
      if (trackIds) {
        const affinity = computeDecayedAffinity(recentPlays, trackIds, now);
        if (affinity > maxAffinity) maxAffinity = affinity;
      }
    }
    if (maxAffinity > 0) {
      const s = maxAffinity * profile.weightArtist;
      score += s;
      const rawPlays = recentPlays.filter((pe) =>
        trackArtistIds.some((id) => artistToTrackIds.get(id)?.has(pe.trackId)),
      ).length;
      reasons.push({
        type: "ARTIST_AFFINITY",
        label: `Вы слушали этого артиста ${rawPlays} раз за 30 дней`,
        weight: s,
      });
    }

    // 2. Genre affinity
    if (track.genre) {
      const genreScore = genreAffinityMap.get(track.genre.toLowerCase()) ?? 0;
      if (genreScore > 0) {
        const s = genreScore * profile.weightGenre;
        score += s;
        reasons.push({ type: "GENRE_MATCH", label: `Жанр: ${track.genre}`, weight: s });
      }
    }

    // 3. Acoustic match — prefer vector similarity (CLAP) over scalar features
    const vectorSim = vectorSimilarityMap.get(track.id) ?? null;
    if (vectorSim !== null && vectorSim > 0.6 && profile.weightAcoustic > 0) {
      const s = vectorSim * profile.weightAcoustic;
      score += s;
      reasons.push({ type: "ACOUSTIC_MATCH", label: "Похоже по звучанию (AI)", weight: s });
    } else {
      const trackFeatures = audioFeaturesMap.get(track.id) ?? null;
      if (trackFeatures && profile.weightAcoustic > 0) {
        const sim = acousticSimilarity(userAcousticVec, trackFeatures);
        if (sim > 0.5) {
          const s = sim * profile.weightAcoustic;
          score += s;
          reasons.push({ type: "ACOUSTIC_MATCH", label: "Похожая акустика", weight: s });
        }
      }
    }

    // 3b. Global popularity (cold start only — no personal history available)
    if (isColdStart) {
      const globalScore = globalPopularityMap.get(track.id) ?? 0;
      if (globalScore > 0) {
        const s = globalScore * QUALITY_SIGNAL_WEIGHT;
        score += s;
        reasons.push({ type: "QUALITY_SIGNAL", label: "Популярный трек", weight: s });
      }
    }

    // 4. Kazakh boost — stronger in cold start to surface KZ artists early
    const isKazakh = track.isLocal || track.artists.some((ta) => ta.artist.isLocal);
    if (isKazakh) {
      const s = isColdStart ? profile.weightKazakh * 1.5 : profile.weightKazakh;
      score += s;
      reasons.push({ type: "KAZAKH_BOOST", label: "Казахский артист", weight: s });
    }

    // 5. Chart momentum
    const chartPos = chartPositionMap.get(track.id);
    if (chartPos !== undefined) {
      const s = (1 - chartPos / 50) * profile.weightChart;
      score += s;
      reasons.push({ type: "CHART_MOMENTUM", label: `#${chartPos} в чарте KZ`, weight: s });
    }

    // 6. Freshness
    const releaseDate = track.release.releaseDate ?? track.createdAt;
    const daysOld = Math.floor(
      (now.getTime() - releaseDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysOld < FRESHNESS_WINDOW_DAYS) {
      const s = (1 - daysOld / FRESHNESS_WINDOW_DAYS) * profile.weightFreshness;
      score += s;
      reasons.push({
        type: "FRESHNESS",
        label: daysOld === 0 ? "Сегодняшняя новинка" : `Новинка · ${daysOld} ${pluralizeDays(daysOld)} назад`,
        weight: s,
      });
    }

    // 7. Quality signal: avg completion from all users (from DB) — personal avg from events
    const personalAvgCompletion = avgCompletionMap.get(track.id);
    if (personalAvgCompletion !== undefined && personalAvgCompletion > 0.7) {
      const s = personalAvgCompletion * QUALITY_SIGNAL_WEIGHT;
      score += s;
      reasons.push({ type: "QUALITY_SIGNAL", label: "Вы обычно дослушиваете до конца", weight: s });
    }

    // 8. Session context: same artist or genre as last 3 played
    const inSessionArtist = trackArtistIds.some((id) => sessionArtistIds.has(id));
    const inSessionGenre = track.genre && sessionGenres.has(track.genre.toLowerCase());
    if (inSessionArtist || inSessionGenre) {
      const s = SESSION_BOOST_WEIGHT * (inSessionArtist ? 1.0 : 0.6);
      score += s;
      reasons.push({
        type: "SESSION_CONTEXT",
        label: inSessionArtist ? "Вы сейчас слушаете этого артиста" : "Подходит к текущей сессии",
        weight: s,
      });
    }

    // 9. Exploration tag
    if (explorationTrackIds.has(track.id)) {
      score += 0.05; // small nudge, not a reason — just ensures exploration candidates survive
      reasons.push({ type: "EXPLORATION", label: "Новый артист для вас", weight: 0.05 });
    }

    // ── Penalties ─────────────────────────────────────────────────────────

    // Fatigue penalty (played in last 7 days)
    if (fatiguedTrackIds.has(track.id)) {
      score *= 0.3;
    }

    // Skip penalty: if user skips this track often → suppress
    const skipRate = skipRateMap.get(track.id) ?? 0;
    if (skipRate > 0.5) {
      score *= 1 - skipRate * 0.8; // high skip rate → near-zero score
    }

    if (score > 0 || reasons.length > 0) {
      scored.push({ trackId: track.id, score, reasons, track: toSummary(track) });
    }
  }

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // ── 5. Post-processing: diversity + exploration injection ─────────────────
  const artistCountInResult = new Map<string, number>();
  const genreCountInResult = new Map<string, number>();
  const explorationSlots = Math.floor(limit * EXPLORATION_RATIO);
  const mainSlots = limit - explorationSlots;

  const mainTracks: ScoredTrack[] = [];
  const explorationTracks: ScoredTrack[] = [];

  for (const st of scored) {
    const artistIds = st.track.artists.map((a) => a.id);
    const genre = (st.track as unknown as CandidateTrack).genre?.toLowerCase() ?? null;

    if (explorationTrackIds.has(st.trackId) && explorationTracks.length < explorationSlots) {
      explorationTracks.push(st);
      continue;
    }

    if (mainTracks.length >= mainSlots) continue;

    // Diversity cap: max MAX_TRACKS_PER_ARTIST per artist
    const artistFull = artistIds.some(
      (id) => (artistCountInResult.get(id) ?? 0) >= MAX_TRACKS_PER_ARTIST,
    );
    if (artistFull) continue;

    // Genre diversity cap: max MAX_TRACKS_PER_GENRE per genre (cold start: reduce to 2)
    const genreCap = isColdStart ? 2 : MAX_TRACKS_PER_GENRE;
    if (genre && (genreCountInResult.get(genre) ?? 0) >= genreCap) continue;

    mainTracks.push(st);
    for (const id of artistIds) {
      artistCountInResult.set(id, (artistCountInResult.get(id) ?? 0) + 1);
    }
    if (genre) {
      genreCountInResult.set(genre, (genreCountInResult.get(genre) ?? 0) + 1);
    }
  }

  // Interleave: insert exploration tracks at positions 5, 10, 15...
  const final: ScoredTrack[] = [];
  let explIdx = 0;
  for (let i = 0; i < mainTracks.length; i++) {
    final.push(mainTracks[i]!);
    if ((i + 1) % 5 === 0 && explIdx < explorationTracks.length) {
      final.push(explorationTracks[explIdx++]!);
    }
  }
  // Append remaining exploration tracks at end
  while (explIdx < explorationTracks.length) {
    final.push(explorationTracks[explIdx++]!);
  }

  const topTracks = final.slice(0, limit);

  // ── 6. Persist RecommendationReason records ───────────────────────────────
  if (topTracks.length > 0) {
    type ReasonJsonInput = { type: string; label: string; weight: number };
    await prisma.recommendationReason.createMany({
      data: topTracks.map((st) => ({
        userId,
        trackId: st.trackId,
        reasons: st.reasons.map((r): ReasonJsonInput => ({
          type: r.type,
          label: r.label,
          weight: r.weight,
        })),
        score: st.score,
      })),
      skipDuplicates: false,
    });
  }

  return { tracks: topTracks, profile };
}

// ─── Explain ──────────────────────────────────────────────────────────────────

export async function explainRecommendation(
  userId: string,
  trackId: string,
): Promise<{ reasons: ReasonItem[]; score: number; servedAt: Date } | null> {
  const record = await prisma.recommendationReason.findFirst({
    where: { userId, trackId },
    orderBy: { servedAt: "desc" },
    select: { reasons: true, score: true, servedAt: true },
  });

  if (!record) return null;

  return {
    reasons: record.reasons as unknown as ReasonItem[],
    score: record.score,
    servedAt: record.servedAt,
  };
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function saveFeedback(
  userId: string,
  trackId: string,
  kind: "HIDE_TRACK" | "HIDE_ARTIST" | "DISLIKE",
): Promise<void> {
  const existing = await prisma.recommendationFeedback.findFirst({
    where: { userId, trackId, kind },
    select: { id: true },
  });

  if (existing == null) {
    await prisma.recommendationFeedback.create({
      data: { userId, trackId, kind },
    });
  }
}

// ─── Underground Radar ────────────────────────────────────────────────────────

export interface UndergroundTrackItem {
  id: string;
  title: string;
  durationMs: number;
  playCount: number;
  score: number;
  release: { id: string; title: string; coverUrl: string | null };
  artist: { id: string; name: string; isLocal: boolean };
}

export interface UndergroundResult {
  items: UndergroundTrackItem[];
  nextCursor: string | null;
}

export interface UndergroundOpts {
  limit?: number;
  threshold?: number;
  cursor?: string;
}

export async function getUndergroundTracks(
  userId: string,
  opts: UndergroundOpts = {},
): Promise<UndergroundResult> {
  const limit = Math.min(opts.limit ?? 20, 50);
  const threshold = opts.threshold ?? 10_000;

  const [feedbacks, likedItems] = await Promise.all([
    prisma.recommendationFeedback.findMany({
      where: { userId, kind: { in: ["HIDE_TRACK", "HIDE_ARTIST"] } },
      select: { kind: true, trackId: true },
    }),
    prisma.libraryItem.findMany({
      where: { userId, entityType: "TRACK", removedAt: null },
      select: { trackId: true },
    }),
  ]);

  const hiddenTrackIds = new Set(
    feedbacks.filter((f) => f.kind === "HIDE_TRACK").map((f) => f.trackId),
  );

  const hiddenArtistSourceTrackIds = feedbacks
    .filter((f) => f.kind === "HIDE_ARTIST")
    .map((f) => f.trackId);

  const hiddenArtistIds = new Set<string>();
  if (hiddenArtistSourceTrackIds.length > 0) {
    const tas = await prisma.trackArtist.findMany({
      where: { trackId: { in: hiddenArtistSourceTrackIds } },
      select: { artistId: true },
    });
    for (const ta of tas) hiddenArtistIds.add(ta.artistId);
  }

  const likedTrackIds = new Set(
    likedItems.map((i) => i.trackId).filter((id): id is string => id !== null),
  );

  const excludeIds = [...hiddenTrackIds, ...likedTrackIds];

  const candidates = await prisma.track.findMany({
    where: {
      isPublished: true,
      playbackStatus: "PLAYABLE",
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      ...(hiddenArtistIds.size > 0
        ? { artists: { none: { artistId: { in: [...hiddenArtistIds] } } } }
        : {}),
      ...(opts.cursor ? { id: { gt: opts.cursor } } : {}),
    },
    include: {
      release: { select: { id: true, title: true, coverAssetUrl: true, releaseDate: true } },
      artists: {
        include: { artist: { select: { id: true, name: true, isLocal: true } } },
        orderBy: { order: "asc" as const },
        take: 1,
      },
      _count: {
        select: { playEvents: true, libraryItems: true },
      },
    },
    take: limit * 10,
    orderBy: { createdAt: "desc" },
  });

  const qualifying = candidates.filter((t) => t._count.playEvents < threshold);

  const qualifyingIds = qualifying.map((t) => t.id);
  const completionAggs =
    qualifyingIds.length > 0
      ? await prisma.playEvent.groupBy({
          by: ["trackId"],
          where: { trackId: { in: qualifyingIds }, completionPct: { not: null } },
          _avg: { completionPct: true },
        })
      : [];

  const completionMap = new Map<string, number>(
    completionAggs.map((a) => [a.trackId, a._avg.completionPct ?? 0]),
  );

  const now = new Date();
  const scored = qualifying.map((t) => {
    const playCount = t._count.playEvents;
    const likeCount = t._count.libraryItems;
    const primaryArtist = t.artists[0]?.artist ?? null;
    const isLocal = t.isLocal || (primaryArtist?.isLocal ?? false);
    const releaseDate = t.release.releaseDate ?? t.createdAt;
    const daysOld = Math.floor(
      (now.getTime() - releaseDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const freshness = Math.max(0, Math.min(1, 1 - daysOld / 365));
    const completionRate = (completionMap.get(t.id) ?? 0) / 100;

    const score =
      (likeCount / Math.max(playCount, 1)) * 0.4 +
      (isLocal ? 0.2 : 0.0) +
      freshness * 0.3 +
      completionRate * 0.1;

    return { track: t, playCount, score: Math.min(1, score) };
  });

  scored.sort((a, b) => b.score - a.score);
  const page = scored.slice(0, limit);

  const items: UndergroundTrackItem[] = page.map(({ track, playCount, score }) => {
    const primaryArtist = track.artists[0]?.artist ?? null;
    return {
      id: track.id,
      title: track.title,
      durationMs: track.durationMs,
      playCount,
      score: Math.round(score * 100) / 100,
      release: {
        id: track.release.id,
        title: track.release.title,
        coverUrl: track.release.coverAssetUrl,
      },
      artist: {
        id: primaryArtist?.id ?? "",
        name: primaryArtist?.name ?? "",
        isLocal: primaryArtist?.isLocal ?? false,
      },
    };
  });

  const lastItem = page[page.length - 1];
  const nextCursor = page.length === limit && lastItem ? lastItem.track.id : null;

  return { items, nextCursor };
}
