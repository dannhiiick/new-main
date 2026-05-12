import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { verifyJwt, getUserId, getUserRole } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  analyzeAudioBuffer,
  createTrackFromIngestion,
  searchArtists,
  uploadCoverBuffer,
} from "./ingestion.service.js";

// ─── Role guard ───────────────────────────────────────────────────────────────

async function verifyAdminRole(
  request: Parameters<typeof verifyJwt>[0],
  reply: Parameters<typeof verifyJwt>[1],
): Promise<void> {
  await verifyJwt(request, reply);
  if (reply.sent) return;
  const role = getUserRole(request);
  if (role !== "ADMIN" && role !== "CATALOG_MANAGER") {
    const body: ProblemDetails = { code: "FORBIDDEN", message: "Insufficient role." };
    await reply.status(403).send(body);
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateTrackSchema = z.object({
  trackTitle: z.string().min(1).max(200),
  releaseTitle: z.string().min(1).max(200),
  releaseType: z.enum(["SINGLE", "EP", "ALBUM"]),
  artistId: z.string().nullable().default(null),
  artistName: z.string().min(1).max(200),
  isLocal: z.boolean(),
  durationMs: z.number().int().min(1),
  trackNumber: z.number().int().min(1).nullable().default(null),
  audioAssetKey: z.string().nullable().default(null),
  isPublished: z.boolean().default(false),
  releaseDate: z.string().nullable().default(null),
  coverUrl: z.string().nullable().default(null),
  genre: z.string().nullable().default(null),
});

// ─── Module ───────────────────────────────────────────────────────────────────

export const ingestionModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  const AUDIO_EXTENSIONS = new Set([
    "mp3", "flac", "aac", "ogg", "opus", "wav", "wave",
    "ape", "wma", "m4a", "alac", "aiff", "aif", "dsf", "dsd",
  ]);

  function isAudioFile(mimetype: string, filename: string): boolean {
    if (mimetype.startsWith("audio/")) return true;
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    return AUDIO_EXTENSIONS.has(ext);
  }

  // Register multipart support for this module only
  await app.register(multipart, {
    limits: { fileSize: 400 * 1024 * 1024 }, // 400 MB — covers lossless APE/FLAC
  });

  // POST /api/admin/ingestion/analyze
  // Upload an MP3 file, get back metadata suggestions + tempAudioKey + tempCoverUrl
  app.post(
    "/analyze",
    { preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        const body: ProblemDetails = { code: "VALIDATION_ERROR", message: "No file uploaded." };
        return reply.status(400).send(body);
      }

      if (!isAudioFile(data.mimetype, data.filename)) {
        const body: ProblemDetails = {
          code: "VALIDATION_ERROR",
          message: "Only audio files are accepted (MP3, FLAC, APE, AAC, WAV, OGG, WMA, etc.).",
        };
        return reply.status(400).send(body);
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const result = await analyzeAudioBuffer(buffer, data.filename);
      return reply.send(result);
    },
  );

  // POST /api/admin/ingestion/cover
  // Upload a cover image manually, get back a presigned URL
  app.post(
    "/cover",
    { preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        const body: ProblemDetails = { code: "VALIDATION_ERROR", message: "No file uploaded." };
        return reply.status(400).send(body);
      }
      if (!data.mimetype.startsWith("image/")) {
        const body: ProblemDetails = {
          code: "VALIDATION_ERROR",
          message: "Only image files are accepted (JPEG, PNG, WebP).",
        };
        return reply.status(400).send(body);
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const coverUrl = await uploadCoverBuffer(buffer, data.filename, data.mimetype);
      return reply.send({ coverUrl });
    },
  );

  // POST /api/admin/ingestion/create
  // Create artist + release + track in one shot
  app.post(
    "/create",
    { preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const body = CreateTrackSchema.parse(request.body);
      const actorId = getUserId(request);
      const result = await createTrackFromIngestion(body, actorId);
      return reply.status(201).send(result);
    },
  );

  // GET /api/admin/ingestion/artists?q=...
  // Autocomplete search for existing artists
  app.get<{ Querystring: { q?: string } }>(
    "/artists",
    { preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const q = request.query.q ?? "";
      const artists = await searchArtists(q);
      return reply.send({ artists });
    },
  );

  // POST /api/admin/ingestion/auto
  // Auto-ingest a single audio file using ID3 tags — no user review needed.
  // Used by bulk batch upload in admin UI.
  app.post(
    "/auto",
    { preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const data = await request.file();
      if (!data) {
        const body: ProblemDetails = { code: "VALIDATION_ERROR", message: "No file uploaded." };
        return reply.status(400).send(body);
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const actorId = getUserId(request);

      const analysis = await analyzeAudioBuffer(buffer, data.filename);

      // Fail fast if S3 upload failed — don't create a track with no audio
      if (analysis.tempAudioKey === null) {
        const body: ProblemDetails = {
          code: "S3_UPLOAD_FAILED",
          message: "Audio file could not be uploaded to storage. Check S3 configuration.",
        };
        return reply.status(500).send(body);
      }

      // Duplicate check — same title + same artist name
      const { prisma } = await import("../../db/client.js");
      const duplicate = await prisma.track.findFirst({
        where: {
          title: { equals: analysis.suggestions.trackTitle, mode: "insensitive" },
          playbackStatus: { not: "REMOVED" },
          artists: {
            some: {
              artist: {
                name: { equals: analysis.suggestions.artistName, mode: "insensitive" },
              },
            },
          },
        },
        select: { id: true, title: true },
      });
      if (duplicate) {
        const body: ProblemDetails = {
          code: "DUPLICATE_TRACK",
          message: `Трек "${analysis.suggestions.trackTitle}" уже существует на сервере.`,
        };
        return reply.status(409).send(body);
      }

      const durationMs = analysis.extracted.durationMs ?? 0;
      const isZeroDuration = durationMs === 0;

      const result = await createTrackFromIngestion(
        {
          trackTitle: analysis.suggestions.trackTitle,
          releaseTitle: analysis.suggestions.releaseTitle,
          releaseType: analysis.suggestions.releaseType,
          artistId: analysis.suggestions.matchedArtist?.id ?? null,
          artistName: analysis.suggestions.artistName,
          isLocal: analysis.suggestions.isLocal,
          durationMs,
          trackNumber: analysis.extracted.trackNumber,
          audioAssetKey: analysis.tempAudioKey,
          isPublished: false,
          releaseDate: analysis.extracted.date ?? null,
          coverUrl: analysis.tempCoverUrl,
          genre: analysis.suggestions.genre,
          audioEmbedding: analysis.audioEmbedding,
          ...(isZeroDuration ? { playbackStatus: "BLOCKED" as const, catalogVisibilityReason: "zero_duration" } : {}),
        },
        actorId,
      );

      return reply.status(201).send({ ...result, zeroDuration: isZeroDuration });
    },
  );
};
