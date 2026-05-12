import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../db/client.js";
import { redis } from "../../utils/redis.js";
import type { TrackSummary } from "../catalog/catalog.service.js";

const CACHE_TTL = 60 * 60; // 1 hour

export interface MoodParams {
  energy: number;      // 0–1
  valence: number;     // 0–1 (positive emotion)
  danceability: number; // 0–1
  tempo: "slow" | "medium" | "fast";
  mood: string[];      // e.g. ["sad", "nostalgic"]
}

export interface MoodSearchResult {
  query: string;
  params: MoodParams;
  tracks: TrackSummary[];
  cached: boolean;
}

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Parse natural language mood description into audio feature parameters.
 */
export async function parseMoodQuery(query: string): Promise<MoodParams> {
  const cacheKey = `mood:params:${Buffer.from(query).toString("base64").slice(0, 32)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as MoodParams;

  const client = getAnthropic();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: `You are a music recommendation assistant. Convert a mood description into music parameters.
Respond ONLY with valid JSON matching this schema exactly:
{
  "energy": <0.0-1.0>,
  "valence": <0.0-1.0>,
  "danceability": <0.0-1.0>,
  "tempo": "<slow|medium|fast>",
  "mood": ["<mood1>", "<mood2>"]
}
Guidelines:
- energy: 0=very calm, 1=very energetic
- valence: 0=very negative/sad, 1=very positive/happy
- danceability: 0=not danceable, 1=very danceable
- tempo: slow(<70bpm), medium(70-120bpm), fast(>120bpm)
- mood: 2-4 descriptive words`,
    messages: [
      {
        role: "user",
        content: `Music mood description: "${query}"`,
      },
    ],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "{}";

  let params: MoodParams;
  try {
    params = JSON.parse(text) as MoodParams;
    // Validate and clamp values
    params.energy = Math.max(0, Math.min(1, params.energy ?? 0.5));
    params.valence = Math.max(0, Math.min(1, params.valence ?? 0.5));
    params.danceability = Math.max(0, Math.min(1, params.danceability ?? 0.5));
    if (!["slow", "medium", "fast"].includes(params.tempo)) params.tempo = "medium";
    if (!Array.isArray(params.mood)) params.mood = [];
  } catch {
    params = { energy: 0.5, valence: 0.5, danceability: 0.5, tempo: "medium", mood: [] };
  }

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(params));
  return params;
}

/**
 * Find tracks matching mood parameters using audio features.
 */
export async function searchByMood(
  query: string,
  userId: string,
  limit = 20,
): Promise<MoodSearchResult> {
  const resultCacheKey = `mood:search:${userId}:${Buffer.from(query).toString("base64").slice(0, 32)}`;
  const cachedResult = await redis.get(resultCacheKey);
  if (cachedResult) {
    const parsed = JSON.parse(cachedResult) as MoodSearchResult;
    return { ...parsed, cached: true };
  }

  const params = await parseMoodQuery(query);

  // Get user's hidden tracks
  const feedbacks = await prisma.recommendationFeedback.findMany({
    where: { userId, kind: { in: ["HIDE_TRACK", "HIDE_ARTIST"] } },
    select: { kind: true, trackId: true },
  });
  const hiddenTrackIds = new Set(
    feedbacks.filter((f) => f.kind === "HIDE_TRACK").map((f) => f.trackId),
  );

  // Find tracks with matching audio features
  const energyMin = Math.max(0, params.energy - 0.25);
  const energyMax = Math.min(1, params.energy + 0.25);
  const valenceMin = Math.max(0, params.valence - 0.25);
  const valenceMax = Math.min(1, params.valence + 0.25);

  const bpmRange = params.tempo === "slow"
    ? { gte: 40, lte: 75 }
    : params.tempo === "medium"
    ? { gte: 70, lte: 125 }
    : { gte: 120, lte: 220 };

  const candidates = await prisma.track.findMany({
    where: {
      isPublished: true,
      playbackStatus: "PLAYABLE",
      ...(hiddenTrackIds.size > 0 ? { id: { notIn: [...hiddenTrackIds] } } : {}),
      audioFeatures: {
        energy: { gte: energyMin, lte: energyMax },
        valence: { gte: valenceMin, lte: valenceMax },
        bpm: bpmRange,
      },
    },
    include: {
      release: { select: { coverAssetUrl: true } },
      artists: {
        include: { artist: { select: { id: true, name: true, slug: true } } },
        orderBy: { order: "asc" as const },
        take: 1,
      },
      audioFeatures: true,
    },
    take: limit * 3,
    orderBy: { createdAt: "desc" },
  });

  // If no candidates with audio features, fall back to random published tracks
  let pool = candidates;
  if (pool.length === 0) {
    pool = await prisma.track.findMany({
      where: {
        isPublished: true,
        playbackStatus: "PLAYABLE",
        ...(hiddenTrackIds.size > 0 ? { id: { notIn: [...hiddenTrackIds] } } : {}),
      },
      include: {
        release: { select: { coverAssetUrl: true } },
        artists: {
          include: { artist: { select: { id: true, name: true, slug: true } } },
          orderBy: { order: "asc" as const },
          take: 1,
        },
        audioFeatures: true,
      },
      take: limit * 2,
      orderBy: [{ isLocal: "desc" }, { createdAt: "desc" }],
    });
  }

  // Score by closeness to target params
  const scored = pool.map((t) => {
    const af = t.audioFeatures;
    if (!af) return { t, score: 0.3 };
    const energyDist = Math.abs((af.energy ?? 0.5) - params.energy);
    const valenceDist = Math.abs((af.valence ?? 0.5) - params.valence);
    const danceDist = Math.abs((af.danceability ?? 0.5) - params.danceability);
    const score = 1 - (energyDist + valenceDist + danceDist) / 3;
    return { t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const tracks: TrackSummary[] = scored.slice(0, limit).map(({ t }) => ({
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
  }));

  const result: MoodSearchResult = { query, params, tracks, cached: false };
  await redis.setex(resultCacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}
