import { prisma } from "../../db/client.js";
import { redis } from "../../utils/redis.js";

const LRCLIB_BASE = "https://lrclib.net/api";
const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface LyricsResult {
  synced: boolean;
  lines: LyricLine[];
  plainText: string | null;
  source: "lrclib" | "cache" | "none";
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const match = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/.exec(raw.trim());
    if (!match) continue;
    const [, mm, ss, cs, text] = match;
    const timeMs =
      parseInt(mm!, 10) * 60_000 +
      parseInt(ss!, 10) * 1_000 +
      parseInt(cs!.padEnd(3, "0"), 10);
    lines.push({ timeMs, text: text!.trim() });
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export async function getLyrics(trackId: string): Promise<LyricsResult> {
  // 1. Check redis cache
  const cacheKey = `lyrics:${trackId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as LyricsResult;
    return { ...parsed, source: "cache" };
  }

  // 2. Load track metadata
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: {
      artists: {
        include: { artist: { select: { name: true } } },
        orderBy: { order: "asc" as const },
        take: 1,
      },
      release: { select: { title: true } },
    },
  });

  if (!track) {
    return { synced: false, lines: [], plainText: null, source: "none" };
  }

  const artistName = track.artists[0]?.artist.name ?? "";
  const albumName = track.release.title;

  // 3. Try LRCLIB
  try {
    const params = new URLSearchParams({
      artist_name: artistName,
      track_name: track.title,
      album_name: albumName,
      duration: Math.round(track.durationMs / 1000).toString(),
    });

    const resp = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
      headers: { "Lrclib-Client": "MoodStream/1.0 (https://moodstream.kz)" },
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      const data = await resp.json() as {
        syncedLyrics?: string | null;
        plainLyrics?: string | null;
      };

      let result: LyricsResult;

      if (data.syncedLyrics) {
        result = {
          synced: true,
          lines: parseLrc(data.syncedLyrics),
          plainText: data.plainLyrics ?? null,
          source: "lrclib",
        };
      } else if (data.plainLyrics) {
        result = {
          synced: false,
          lines: data.plainLyrics
            .split("\n")
            .map((text, i) => ({ timeMs: i * 3000, text })),
          plainText: data.plainLyrics,
          source: "lrclib",
        };
      } else {
        result = { synced: false, lines: [], plainText: null, source: "none" };
      }

      // Cache result (even "none" to avoid repeated API calls)
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      return result;
    }
  } catch {
    // LRCLIB unavailable — return empty
  }

  const empty: LyricsResult = { synced: false, lines: [], plainText: null, source: "none" };
  await redis.setex(cacheKey, 60 * 60, JSON.stringify(empty)); // cache miss for 1hr
  return empty;
}
