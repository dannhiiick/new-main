import { prisma } from "../../db/client.js";
import type { TrackSummary } from "../catalog/catalog.service.js";

// ─── Score weights ────────────────────────────────────────────────────────────
const W_COMPLETION = 3.0;
const W_ADD_TO_LIBRARY = 3.0;
const W_REPEAT_PLAY = 2.0;
const W_UNIQUE_USERS = 1.5;
const W_RAW_START = 0.5;
const W_SUSPICIOUS_PENALTY = 5.0;

/** Minimum fraction of duration for a play to count as a completion */
const COMPLETION_MIN_FRACTION = 0.8;

/** Hours window in which a replay counts as "repeat" (48 h) */
const REPEAT_WINDOW_HOURS = 48;

export interface ChartEntryItem {
  position: number;
  prevPos: number | null;
  peakPos: number | null;
  weeksOn: number;
  track: TrackSummary;
}

export interface ChartResponse {
  slug: string;
  title: string;
  territory: string;
  updatedAt: string;
  entries: ChartEntryItem[];
}

const TRACK_INCLUDE = {
  release: { select: { coverAssetUrl: true } },
  artists: {
    include: { artist: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: "asc" as const },
  },
} as const;

export async function getChart(slug: string): Promise<ChartResponse | null> {
  const chart = await prisma.chart.findUnique({
    where: { slug, isPublished: true },
    include: {
      entries: {
        orderBy: { position: "asc" },
        include: {
          chart: false,
          // We query track separately below to apply published filter
        },
      },
    },
  });

  if (chart == null) return null;

  // Fetch tracks in one query, only published + playable
  const trackIds = chart.entries.map((e) => e.trackId);
  const tracks = await prisma.track.findMany({
    where: {
      id: { in: trackIds },
      isPublished: true,
      playbackStatus: "PLAYABLE",
    },
    include: TRACK_INCLUDE,
  });

  const trackMap = new Map(
    tracks.map((t) => [
      t.id,
      {
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
      } satisfies TrackSummary,
    ]),
  );

  const entries: ChartEntryItem[] = chart.entries.flatMap((entry) => {
    const track = trackMap.get(entry.trackId);
    if (track == null) return [];
    return [
      {
        position: entry.position,
        prevPos: entry.prevPos,
        peakPos: entry.peakPos,
        weeksOn: entry.weeksOn,
        track,
      },
    ];
  });

  return {
    slug: chart.slug,
    title: chart.title,
    territory: chart.territory,
    updatedAt: chart.updatedAt.toISOString(),
    entries,
  };
}

// ─── Quality Chart Score ──────────────────────────────────────────────────────

export interface ChartScoreResult {
  trackId: string;
  score: number;
  completionCount: number;
  addToLibraryCount: number;
  repeatPlayCount: number;
  uniqueUsersCount: number;
  rawStartCount: number;
  suspiciousEventCount: number;
}

/**
 * Calculate quality chart score for a single track over the given window.
 *
 * score = completionCount * 3.0
 *       + addToLibraryCount * 3.0
 *       + repeatPlayCount * 2.0
 *       + uniqueUsersCount * 1.5
 *       + rawStartCount * 0.5
 *       - suspiciousEventCount * 5.0
 */
export async function calculateChartScore(
  trackId: string,
  windowDays = 7,
): Promise<ChartScoreResult> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Fetch all START events in window (non-suspicious only for positive signals)
  const events = await prisma.playEvent.findMany({
    where: {
      trackId,
      startedAt: { gte: windowStart },
    },
    select: {
      id: true,
      userId: true,
      action: true,
      position: true,
      durationMs: true,
      startedAt: true,
      suspicious: true,
    },
    orderBy: { startedAt: "asc" },
  });

  // Count suspicious events
  const suspiciousEventCount = events.filter((e) => e.suspicious).length;

  // Only non-suspicious events contribute to positive signals
  const cleanEvents = events.filter((e) => !e.suspicious);

  // rawStartCount: all START events (clean)
  const rawStartCount = cleanEvents.filter((e) => e.action === "START").length;

  // completionCount: COMPLETE events where position >= 80% of duration
  const completionCount = cleanEvents.filter((e) => {
    if (e.action !== "COMPLETE") return false;
    if (e.durationMs == null || e.durationMs <= 0) return false;
    // position is in seconds, durationMs in ms
    return e.position != null && e.position >= COMPLETION_MIN_FRACTION * (e.durationMs / 1000);
  }).length;

  // uniqueUsersCount: distinct users who played (any action, clean)
  const uniqueUsersCount = new Set(cleanEvents.map((e) => e.userId)).size;

  // repeatPlayCount: same user replayed the same track within 48h window
  let repeatPlayCount = 0;
  const repeatWindowMs = REPEAT_WINDOW_HOURS * 60 * 60 * 1000;
  const startsByUser = new Map<string, Date[]>();
  for (const e of cleanEvents) {
    if (e.action !== "START") continue;
    const prev = startsByUser.get(e.userId) ?? [];
    // Count as repeat if there is a prior play within the repeat window
    const isRepeat = prev.some(
      (prevDate) => e.startedAt.getTime() - prevDate.getTime() <= repeatWindowMs,
    );
    if (isRepeat) repeatPlayCount++;
    prev.push(e.startedAt);
    startsByUser.set(e.userId, prev);
  }

  // addToLibraryCount: library items added in window (liked/saved) for this track
  const addToLibraryCount = await prisma.libraryItem.count({
    where: {
      trackId,
      addedAt: { gte: windowStart },
      removedAt: null,
    },
  });

  const score =
    completionCount * W_COMPLETION +
    addToLibraryCount * W_ADD_TO_LIBRARY +
    repeatPlayCount * W_REPEAT_PLAY +
    uniqueUsersCount * W_UNIQUE_USERS +
    rawStartCount * W_RAW_START -
    suspiciousEventCount * W_SUSPICIOUS_PENALTY;

  return {
    trackId,
    score: Math.max(0, score), // floor at 0
    completionCount,
    addToLibraryCount,
    repeatPlayCount,
    uniqueUsersCount,
    rawStartCount,
    suspiciousEventCount,
  };
}

/**
 * Upsert chart score for a track into the ChartScore table.
 */
export async function upsertChartScore(
  result: ChartScoreResult,
  windowDays = 7,
): Promise<void> {
  await prisma.chartScore.upsert({
    where: { trackId: result.trackId },
    create: {
      trackId: result.trackId,
      score: result.score,
      completionCount: result.completionCount,
      addToLibraryCount: result.addToLibraryCount,
      repeatPlayCount: result.repeatPlayCount,
      uniqueUsersCount: result.uniqueUsersCount,
      rawStartCount: result.rawStartCount,
      suspiciousEventCount: result.suspiciousEventCount,
      windowDays,
    },
    update: {
      score: result.score,
      completionCount: result.completionCount,
      addToLibraryCount: result.addToLibraryCount,
      repeatPlayCount: result.repeatPlayCount,
      uniqueUsersCount: result.uniqueUsersCount,
      rawStartCount: result.rawStartCount,
      suspiciousEventCount: result.suspiciousEventCount,
      windowDays,
      calculatedAt: new Date(),
    },
  });
}
