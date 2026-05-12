import { createReadStream, statSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3ClientConfig } from "@aws-sdk/client-s3";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import { redis } from "../../utils/redis.js";
import { PlayEventValidator } from "./play-event-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// audio folder is at backend/audio/
const AUDIO_DIR = path.resolve(__dirname, "../../../../audio");

function createS3Client(): S3Client {
  const endpoint = process.env["S3_ENDPOINT"];
  const config: S3ClientConfig = {
    region: process.env["S3_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: process.env["S3_ACCESS_KEY_ID"] ?? "",
      secretAccessKey: process.env["S3_SECRET_ACCESS_KEY"] ?? "",
    },
    forcePathStyle: true,
  };
  if (endpoint != null) {
    config.endpoint = endpoint;
  }
  return new S3Client(config);
}

async function generatePresignedUrl(audioAssetKey: string): Promise<string> {
  const s3 = createS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "moodstream-audio";
  const command = new GetObjectCommand({ Bucket: bucket, Key: audioAssetKey });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

// Per-user stream rate limit: max 200 stream requests per hour via Redis
const STREAM_LIMIT_PER_HOUR = 200;
const STREAM_WINDOW_SEC = 60 * 60;

async function checkStreamRateLimit(userId: string): Promise<boolean> {
  const key = `stream:rate:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, STREAM_WINDOW_SEC);
  }
  return count <= STREAM_LIMIT_PER_HOUR;
}

const MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

function audioMime(format: string | null): string {
  if (format != null && format in MIME_MAP) {
    return MIME_MAP[format] ?? "audio/mpeg";
  }
  return "audio/mpeg";
}

export const playerModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // GET /stream/:trackId — requires auth
  app.get<{ Params: { trackId: string } }>(
    "/stream/:trackId",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { trackId } = request.params;
      const userId = getUserId(request);

      // Per-user stream rate limit: 200/hour — prevents bulk audio scraping
      const allowed = await checkStreamRateLimit(userId);
      if (!allowed) {
        const body: ProblemDetails = {
          code: "RATE_LIMITED",
          message: "Stream rate limit exceeded. Try again later.",
        };
        return reply.status(429).send(body);
      }

      const track = await prisma.track.findUnique({
        where: { id: trackId },
        select: {
          id: true,
          isPublished: true,
          playbackStatus: true,
          audioAssetKey: true,
          audioFormat: true,
        },
      });

      if (track == null) {
        const body: ProblemDetails = {
          code: "NOT_FOUND",
          message: "Track not found",
        };
        return reply.status(404).send(body);
      }

      if (!track.isPublished || track.playbackStatus !== "PLAYABLE") {
        const body: ProblemDetails = {
          code: "TRACK_UNAVAILABLE",
          message: "Track is not available for playback",
        };
        return reply.status(403).send(body);
      }

      const s3Endpoint = process.env["S3_ENDPOINT"];

      if (s3Endpoint != null && s3Endpoint.length > 0) {
        // Production path: presigned URL redirect
        if (track.audioAssetKey == null) {
          const body: ProblemDetails = {
            code: "NO_AUDIO",
            message: "Audio file not available",
          };
          return reply.status(404).send(body);
        }
        const url = await generatePresignedUrl(track.audioAssetKey);
        return reply.redirect(url, 302);
      }

      // Dev path: serve local file
      if (track.audioAssetKey == null) {
        const body: ProblemDetails = {
          code: "NO_AUDIO",
          message: "No audio file configured for this track",
        };
        return reply.status(404).send(body);
      }

      const localPath = path.join(AUDIO_DIR, track.audioAssetKey);

      if (!existsSync(localPath)) {
        const body: ProblemDetails = {
          code: "AUDIO_FILE_NOT_FOUND",
          message: "Audio file not found on disk",
        };
        return reply.status(404).send(body);
      }

      const stat = statSync(localPath);
      const fileSize = stat.size;
      const rangeHeader = request.headers.range;
      const mimeType = audioMime(track.audioFormat);

      if (rangeHeader != null) {
        const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (match == null) {
          return reply
            .status(416)
            .send({ code: "INVALID_RANGE", message: "Invalid Range header" });
        }
        const start = parseInt(match[1] ?? "0", 10);
        const end =
          match[2] != null && match[2].length > 0
            ? parseInt(match[2], 10)
            : fileSize - 1;

        if (start > end || end >= fileSize) {
          void reply.raw.writeHead(416, {
            "Content-Range": `bytes */${fileSize}`,
          });
          reply.raw.end();
          return reply;
        }

        const chunkSize = end - start + 1;
        const stream = createReadStream(localPath, { start, end });

        void reply.raw.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": mimeType,
        });
        stream.pipe(reply.raw);
        return reply;
      }

      // Full file
      void reply.raw.writeHead(200, {
        "Content-Length": fileSize.toString(),
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
      });
      createReadStream(localPath).pipe(reply.raw);
      return reply;
    },
  );

  // ── Test Session endpoints ────────────────────────────────────────────────

  // POST /player/test-session/start
  app.post(
    "/player/test-session/start",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const userId = getUserId(request);
      // End any existing active session first
      await prisma.testSession.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "ENDED_DISCARDED", endedAt: new Date() },
      });
      const session = await prisma.testSession.create({
        data: { userId },
        select: { id: true, createdAt: true, status: true },
      });
      return reply.status(201).send(session);
    },
  );

  // POST /player/test-session/end
  app.post<{ Body: { keep: boolean } }>(
    "/player/test-session/end",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const BodySchema = z.object({ keep: z.boolean() });
      const { keep } = BodySchema.parse(request.body);
      const userId = getUserId(request);

      const session = await prisma.testSession.findFirst({
        where: { userId, status: "ACTIVE" },
        include: { interactions: { where: { action: "LIKE" }, select: { trackId: true } } },
      });
      if (session == null) {
        return reply.status(404).send({ code: "NO_ACTIVE_SESSION", message: "No active test session" });
      }

      const newStatus = keep ? "ENDED_KEPT" : "ENDED_DISCARDED";
      await prisma.testSession.update({
        where: { id: session.id },
        data: { status: newStatus, endedAt: new Date() },
      });

      let transferredCount = 0;
      if (keep && session.interactions.length > 0) {
        // Transfer likes to real library
        const existing = await prisma.libraryItem.findMany({
          where: {
            userId,
            trackId: { in: session.interactions.map(i => i.trackId) },
            entityType: "TRACK",
            removedAt: null,
          },
          select: { trackId: true },
        });
        const existingIds = new Set(existing.map(e => e.trackId));
        const toAdd = session.interactions.filter(i => !existingIds.has(i.trackId));
        if (toAdd.length > 0) {
          await prisma.libraryItem.createMany({
            data: toAdd.map(i => ({ userId, trackId: i.trackId, entityType: "TRACK" as const })),
          });
          transferredCount = toAdd.length;
        }
      }

      return reply.send({ kept: keep, transferredCount });
    },
  );

  // GET /player/test-session/current
  app.get(
    "/player/test-session/current",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const userId = getUserId(request);
      const session = await prisma.testSession.findFirst({
        where: { userId, status: "ACTIVE" },
        select: {
          id: true,
          createdAt: true,
          _count: { select: { interactions: true } },
        },
      });
      if (session == null) return reply.send({ active: false });
      return reply.send({ active: true, session });
    },
  );

  // POST /player/test-session/interact — like/skip/unlike inside test session
  app.post<{ Body: { trackId: string; action: string } }>(
    "/player/test-session/interact",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const BodySchema = z.object({
        trackId: z.string().min(1),
        action: z.enum(["LIKE", "SKIP", "PLAY", "UNLIKE"]),
      });
      const { trackId, action } = BodySchema.parse(request.body);
      const userId = getUserId(request);

      const session = await prisma.testSession.findFirst({
        where: { userId, status: "ACTIVE" },
        select: { id: true },
      });
      if (session == null) {
        return reply.status(404).send({ code: "NO_ACTIVE_SESSION", message: "No active test session" });
      }

      await prisma.testInteraction.create({
        data: { sessionId: session.id, trackId, action },
      });

      return reply.status(204).send();
    },
  );

  // POST /player/events — log a play event with anti-manipulation validation
  app.post(
    "/player/events",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const BodySchema = z.object({
        trackId: z.string().min(1),
        action: z.enum(["START", "PAUSE", "RESUME", "COMPLETE", "SKIP"]).default("START"),
        position: z.number().min(0).default(0),
        duration: z.number().min(0).default(0),
        sessionId: z.string().min(1).default(() => crypto.randomUUID()),
        clientTimestamp: z.number().int().positive().default(() => Date.now()),
        completionPct: z.number().int().min(0).max(100).optional(),
        durationMs: z.number().int().positive().optional(),
        locale: z.enum(["kk", "ru", "en"]).optional(),
        territory: z.enum(["KZ", "KG", "UZ", "AZ", "TJ", "TM", "GLOBAL"]).optional(),
        testSessionId: z.string().optional(),
      });
      const body = BodySchema.parse(request.body);
      const userId = getUserId(request);
      const ip =
        (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
        request.ip ??
        "unknown";

      // Verify track exists (non-throwing — fire-and-forget semantics)
      const track = await prisma.track.findUnique({
        where: { id: body.trackId, isPublished: true },
        select: { id: true },
      });
      if (track == null) {
        return reply.status(204).send();
      }

      // Anti-manipulation validation
      const validator = new PlayEventValidator(redis);
      const validation = await validator.validate({
        userId,
        trackId: body.trackId,
        action: body.action,
        position: body.position,
        duration: body.duration,
        sessionId: body.sessionId,
        clientTimestamp: body.clientTimestamp,
        ip,
      });

      if (!validation.allowed) {
        // Rejected events are silently dropped (204) to avoid leaking validation logic
        return reply.status(204).send();
      }

      await prisma.playEvent.create({
        data: {
          userId,
          trackId: body.trackId,
          action: body.action as "START" | "PAUSE" | "RESUME" | "COMPLETE" | "SKIP",
          position: body.position,
          sessionId: body.sessionId,
          clientTimestamp: new Date(body.clientTimestamp),
          suspicious: validation.suspicious,
          ...(body.completionPct !== undefined ? { completionPct: body.completionPct } : {}),
          ...(body.durationMs !== undefined ? { durationMs: body.durationMs } : {}),
          ...(body.locale !== undefined ? { locale: body.locale } : {}),
          ...(body.territory !== undefined ? { territory: body.territory } : {}),
          ...(body.testSessionId !== undefined ? { testSessionId: body.testSessionId } : {}),
        },
      });

      return reply.status(204).send();
    },
  );

  // GET /catalog/tracks/:id/stream-url — presigned URL endpoint
  app.get<{ Params: { id: string } }>(
    "/catalog/tracks/:id/stream-url",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { id } = request.params;

      const track = await prisma.track.findUnique({
        where: { id },
        select: {
          isPublished: true,
          playbackStatus: true,
          audioAssetKey: true,
        },
      });

      if (track == null) {
        const body: ProblemDetails = {
          code: "NOT_FOUND",
          message: "Track not found",
        };
        return reply.status(404).send(body);
      }

      if (!track.isPublished || track.playbackStatus !== "PLAYABLE") {
        const body: ProblemDetails = {
          code: "TRACK_UNAVAILABLE",
          message: "Track is not available for playback",
        };
        return reply.status(403).send(body);
      }

      if (track.audioAssetKey == null) {
        const body: ProblemDetails = {
          code: "NO_AUDIO",
          message: "No audio asset configured",
        };
        return reply.status(404).send(body);
      }

      const s3Endpoint = process.env["S3_ENDPOINT"];
      if (s3Endpoint == null || s3Endpoint.length === 0) {
        const body: ProblemDetails = {
          code: "S3_NOT_CONFIGURED",
          message: "S3 is not configured in this environment",
        };
        return reply.status(503).send(body);
      }

      const url = await generatePresignedUrl(track.audioAssetKey);
      const expiresAt = new Date(Date.now() + 300 * 1000).toISOString();

      return reply.send({ url, expiresAt });
    },
  );

  // POST /device/push-token — register Expo push token for this device
  app.post(
    "/device/push-token",
    { preHandler: [verifyJwt] },
    async (request, reply) => {
      const { token, deviceId } = z.object({
        token: z.string().min(1),
        deviceId: z.string().min(1),
      }).parse(request.body);

      const userId = getUserId(request);

      await prisma.userDevice.upsert({
        where: { deviceId },
        create: {
          userId,
          deviceId,
          platform: "mobile",
          expoPushToken: token,
        },
        update: {
          expoPushToken: token,
          lastSeenAt: new Date(),
        },
      });

      return reply.status(204).send();
    },
  );
};
