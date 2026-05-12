import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { uploadBuffer, getPresignedGetUrl } from "../../utils/s3.js";
import { getAudioEmbedding, formatVector } from "../../utils/embeddings.js";
import { fetchCoverFromMusicBrainz } from "../../utils/musicbrainz.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalyzeResult {
  extracted: {
    title: string | null;
    artist: string | null;
    album: string | null;
    year: number | null;
    date: string | null;
    trackNumber: number | null;
    genre: string | null;
    durationMs: number | null;
  };
  suggestions: {
    trackTitle: string;
    releaseTitle: string;
    releaseType: "SINGLE" | "EP" | "ALBUM";
    isLocal: boolean;
    slug: string;
    matchedArtist: { id: string; name: string; slug: string; isLocal: boolean } | null;
    artistName: string;
    genre: string | null;
  };
  tempAudioKey: string | null;
  tempCoverUrl: string | null;
  audioEmbedding: number[] | null;
}

export interface CreateTrackInput {
  trackTitle: string;
  releaseTitle: string;
  releaseType: "SINGLE" | "EP" | "ALBUM";
  artistId: string | null;
  artistName: string;
  isLocal: boolean;
  durationMs: number;
  trackNumber: number | null;
  audioAssetKey: string | null;
  isPublished: boolean;
  releaseDate: string | null;
  coverUrl: string | null;
  genre: string | null;
  audioEmbedding?: number[] | null;
  playbackStatus?: "PLAYABLE" | "PROCESSING" | "BLOCKED" | "REMOVED";
  catalogVisibilityReason?: string | null;
}

export interface CreateTrackResult {
  trackId: string;
  releaseId: string;
  artistId: string;
  trackTitle: string;
  artistName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const KZ_ARTIST_HINTS = [
  "кайрат", "dimash", "дімаш", "иманбек", "скриптонит", "jah khalib",
  "батырхан", "роза рымбаева", "нұрлан", "нурлан", "казах", "қазақ",
  "абай", "алматы", "астана", "мбт", "зат тарих", "moldanazar",
  "ninety one", "ninety1", "beiniyeti", "айгерим", "gakku",
];

function guessIsLocal(artistName: string, existingIsLocal?: boolean): boolean {
  if (existingIsLocal !== undefined) return existingIsLocal;
  const lower = artistName.toLowerCase();
  return KZ_ARTIST_HINTS.some((hint) => lower.includes(hint));
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function guessReleaseType(
  album: string | null,
  title: string | null,
  trackTotal?: number,
): "SINGLE" | "EP" | "ALBUM" {
  if (!album || album === title) return "SINGLE";
  if (trackTotal && trackTotal > 1) return "ALBUM";
  const lower = album.toLowerCase();
  if (lower.includes(" ep") || lower.endsWith("ep")) return "EP";
  return "ALBUM";
}

// ─── Audio MIME type mapping ──────────────────────────────────────────────────

const EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  wave: "audio/wav",
  ape: "audio/x-ape",
  wma: "audio/x-ms-wma",
  m4a: "audio/mp4",
  alac: "audio/x-m4a",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  dsf: "audio/dsf",
  dsd: "audio/dsd",
};

function getMimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "audio/mpeg";
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function analyzeAudioBuffer(buffer: Buffer, filename: string): Promise<AnalyzeResult> {
  // Parse metadata tags — use correct MIME from extension so APE/FLAC/WMA parse correctly
  let tags: Awaited<ReturnType<typeof parseBuffer>> | null = null;
  try {
    tags = await parseBuffer(buffer, { mimeType: getMimeFromFilename(filename) });
  } catch {
    // If parsing fails, continue with filename-based fallback
  }

  const common = tags?.common;
  const format = tags?.format;

  // Extract raw values
  const rawTitle = common?.title ?? null;
  const rawArtist = common?.artist ?? common?.albumartist ?? null;
  const rawAlbum = common?.album ?? null;
  const rawYear = common?.year ?? null;
  const rawTrackNumber = typeof common?.track?.no === "number" ? common.track.no : null;
  const rawTrackTotal = typeof common?.track?.of === "number" ? common.track.of : undefined;
  const rawGenre = common?.genre?.[0] ?? null;
  const rawDuration = format?.duration ? Math.round(format.duration * 1000) : null;
  const rawDate = common?.date ?? (rawYear != null ? String(rawYear) : null);

  // Fallback: derive title from filename
  const filenameTitle = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();

  const title = rawTitle ?? filenameTitle;
  const artistName = rawArtist ?? "Unknown Artist";
  const album = rawAlbum ?? title;

  // Search for existing artist by name (case-insensitive)
  const matchedArtist = await prisma.artist.findFirst({
    where: { name: { equals: artistName, mode: "insensitive" } },
    select: { id: true, name: true, slug: true, isLocal: true },
  });

  const isLocal = guessIsLocal(artistName, matchedArtist?.isLocal);
  const releaseType = guessReleaseType(rawAlbum, rawTitle, rawTrackTotal);
  const releaseTitle = album;

  // Generate a unique slug base
  const slugBase = toSlug(title);
  const slug = slugBase || "track";

  // Upload audio buffer to MinIO — errors are non-fatal (track stays PROCESSING)
  let tempAudioKey: string | null = null;
  try {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "mp3";
    tempAudioKey = `tmp/${randomUUID()}.${ext}`;
    await uploadBuffer(buffer, tempAudioKey);
  } catch {
    tempAudioKey = null;
  }

  // Generate CLAP audio embedding via HuggingFace (non-blocking, best-effort)
  let audioEmbedding: number[] | null = null;
  try {
    audioEmbedding = await getAudioEmbedding(buffer);
  } catch {
    audioEmbedding = null;
  }

  // Extract embedded cover art and upload to MinIO
  let tempCoverUrl: string | null = null;
  const picture = tags?.common.picture?.[0];
  if (picture != null) {
    try {
      const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = mimeToExt[picture.format] ?? "jpg";
      const coverKey = `covers/tmp/${randomUUID()}.${ext}`;
      await uploadBuffer(Buffer.from(picture.data), coverKey, picture.format);
      tempCoverUrl = await getPresignedGetUrl(coverKey);
    } catch {
      tempCoverUrl = null;
    }
  }

  // Fallback: fetch cover from MusicBrainz if MP3 has no embedded art
  if (tempCoverUrl === null && artistName !== "Unknown Artist" && rawAlbum) {
    tempCoverUrl = await fetchCoverFromMusicBrainz(artistName, rawAlbum);
  }

  return {
    extracted: {
      title: rawTitle,
      artist: rawArtist,
      album: rawAlbum,
      year: rawYear ?? null,
      date: rawDate,
      trackNumber: rawTrackNumber,
      genre: rawGenre,
      durationMs: rawDuration,
    },
    suggestions: {
      trackTitle: title,
      releaseTitle,
      releaseType,
      isLocal,
      slug,
      matchedArtist: matchedArtist ?? null,
      artistName: matchedArtist?.name ?? artistName,
      genre: rawGenre,
    },
    tempAudioKey,
    tempCoverUrl,
    audioEmbedding,
  };
}

export async function uploadCoverBuffer(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const coverKey = `covers/tmp/${randomUUID()}.${ext}`;
  await uploadBuffer(buffer, coverKey, mimetype);
  return getPresignedGetUrl(coverKey);
}

export async function createTrackFromIngestion(
  input: CreateTrackInput,
  actorId: string,
): Promise<CreateTrackResult> {
  // Generate slug helpers
  const artistSlug = toSlug(input.artistName) || "artist";
  const releaseSlug = toSlug(input.releaseTitle) || "release";

  // Ensure unique slugs by appending timestamp if collision
  const ts = Date.now().toString(36);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Resolve or create artist
    let artist: { id: string; name: string };
    if (input.artistId) {
      artist = await tx.artist.findUniqueOrThrow({
        where: { id: input.artistId },
        select: { id: true, name: true },
      });
    } else {
      // Try to find by name first
      const existing = await tx.artist.findFirst({
        where: { name: { equals: input.artistName, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (existing) {
        artist = existing;
      } else {
        const slug = await ensureUniqueArtistSlug(tx, artistSlug, ts);
        artist = await tx.artist.create({
          data: {
            name: input.artistName,
            slug,
            isLocal: input.isLocal,
            isPublished: true,
          },
          select: { id: true, name: true },
        });
      }
    }

    // 2. Create release
    const rSlug = await ensureUniqueReleaseSlug(tx, releaseSlug, ts);
    const release = await tx.release.create({
      data: {
        title: input.releaseTitle,
        slug: rSlug,
        releaseType: input.releaseType,
        artistId: artist.id,
        isPublished: input.isPublished,
        coverAssetUrl: input.coverUrl,
        releaseDate: input.releaseDate != null ? new Date(input.releaseDate) : null,
      },
      select: { id: true },
    });

    // 3. Create track
    const track = await tx.track.create({
      data: {
        title: input.trackTitle,
        durationMs: input.durationMs,
        trackNumber: input.trackNumber,
        isLocal: input.isLocal,
        isPublished: input.isPublished,
        playbackStatus: input.playbackStatus ?? (input.audioAssetKey ? "PLAYABLE" : "PROCESSING"),
        catalogVisibilityReason: input.catalogVisibilityReason ?? null,
        releaseId: release.id,
        audioAssetKey: input.audioAssetKey,
        sourcePolicy: "CURATED",
        ...(input.genre !== null ? { genre: input.genre.toLowerCase() } : {}),
      },
      select: { id: true },
    });

    // 4. Link artist to track
    await tx.trackArtist.create({
      data: { trackId: track.id, artistId: artist.id, role: "PRIMARY", order: 0 },
    });

    // 5. Save audio embedding if available
    if (input.audioEmbedding) {
      await tx.$executeRaw`
        INSERT INTO track_audio_features ("id", "trackId", "embedding", "updatedAt")
        VALUES (
          ${randomUUID()},
          ${track.id},
          ${formatVector(input.audioEmbedding)}::vector,
          NOW()
        )
        ON CONFLICT ("trackId") DO UPDATE
          SET "embedding" = ${formatVector(input.audioEmbedding)}::vector,
              "updatedAt" = NOW()
      `;
    }

    // 6. Audit log
    await tx.auditLog.create({
      data: {
        actorId,
        action: "INGEST_TRACK",
        entityType: "Track",
        entityId: track.id,
        after: {
          title: input.trackTitle,
          artistName: input.artistName,
          releaseTitle: input.releaseTitle,
        },
      },
    });

    return {
      trackId: track.id,
      releaseId: release.id,
      artistId: artist.id,
      trackTitle: input.trackTitle,
      artistName: artist.name,
    };
  });
}

// ─── Slug uniqueness helpers ──────────────────────────────────────────────────

async function ensureUniqueArtistSlug(
  tx: Prisma.TransactionClient,
  base: string,
  suffix: string,
): Promise<string> {
  const existing = await tx.artist.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${suffix}`;
}

async function ensureUniqueReleaseSlug(
  tx: Prisma.TransactionClient,
  base: string,
  suffix: string,
): Promise<string> {
  const existing = await tx.release.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${suffix}`;
}

// ─── Search artists for autocomplete ─────────────────────────────────────────

export async function searchArtists(q: string): Promise<{ id: string; name: string; slug: string; isLocal: boolean }[]> {
  if (!q.trim()) return [];
  return prisma.artist.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true, slug: true, isLocal: true },
    take: 10,
    orderBy: { name: "asc" },
  });
}
