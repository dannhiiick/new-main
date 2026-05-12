import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId, getUserRole } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import { prisma } from "../../db/client.js";
import { writeAuditLog } from "../../utils/audit.js";
import {
  adminGetTracks,
  adminGetTrackById,
  adminPatchTrack,
  adminGetUsers,
  adminGetArtists,
  adminGetReleases,
  adminUpdateUser,
  adminBulkArchiveTracks,
  adminBulkSetPublished,
  adminBulkSetPlayable,
  adminGetAnalytics,
  adminGetArtistById,
  adminPatchArtist,
  adminGetReleaseById,
  adminPatchRelease,
} from "./admin.service.js";

// ─── Role guard ───────────────────────────────────────────────────────────────

async function verifyAdminRole(
  request: Parameters<typeof verifyJwt>[0],
  reply: Parameters<typeof verifyJwt>[1],
): Promise<void> {
  await verifyJwt(request, reply);
  if (reply.sent) return; // verifyJwt already replied with 401

  const role = getUserRole(request);
  if (role !== "ADMIN" && role !== "CATALOG_MANAGER") {
    const body: ProblemDetails = {
      code: "FORBIDDEN",
      message: "Insufficient role. Requires ADMIN or CATALOG_MANAGER.",
    };
    await reply.status(403).send(body);
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
  q: z.string().max(200).default(""),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const PatchBodySchema = z
  .object({
    isPublished: z.boolean().optional(),
    playbackStatus: z
      .enum(["PLAYABLE", "PROCESSING", "BLOCKED", "REMOVED"])
      .optional(),
    title: z.string().min(1).max(200).optional(),
    genre: z.string().max(100).nullable().optional(),
    isLocal: z.boolean().optional(),
    offlineEligible: z.boolean().optional(),
    isExplicit: z.boolean().optional(),
    catalogVisibilityReason: z.string().max(200).nullable().optional(),
  })
  .refine(
    (d) =>
      d.isPublished !== undefined ||
      d.playbackStatus !== undefined ||
      d.title !== undefined ||
      d.genre !== undefined ||
      d.isLocal !== undefined ||
      d.offlineEligible !== undefined ||
      d.isExplicit !== undefined ||
      d.catalogVisibilityReason !== undefined,
    { message: "At least one field is required" },
  );

const PatchUserBodySchema = z
  .object({
    role: z.enum(["USER", "CATALOG_MANAGER", "ADMIN"]).optional(),
    isBanned: z.boolean().optional(),
  })
  .refine(
    (d) => d.role !== undefined || d.isBanned !== undefined,
    { message: "At least one field (role or isBanned) is required" },
  );

// ─── Module ───────────────────────────────────────────────────────────────────

export const adminModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // Admin route rate limit: 60 req/min per IP
  const adminRateLimit = {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  };

  // GET /api/admin/catalog/tracks
  app.get(
    "/catalog/tracks",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const query = ListQuerySchema.parse(request.query);
      const result = await adminGetTracks({
        ...(query.q ? { q: query.q } : {}),
        ...(query.cursor != null ? { cursor: query.cursor } : {}),
        limit: query.limit,
      });
      return reply.send(result);
    },
  );

  // GET /api/admin/catalog/tracks/:id
  app.get<{ Params: { id: string } }>(
    "/catalog/tracks/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const { id } = request.params;
      const track = await adminGetTrackById(id);
      return reply.send(track);
    },
  );

  // PATCH /api/admin/catalog/tracks/:id
  app.patch<{ Params: { id: string } }>(
    "/catalog/tracks/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const { id } = request.params;
      const body = PatchBodySchema.parse(request.body);
      const actorId = getUserId(request);

      const updated = await adminPatchTrack(actorId, id, {
        ...(body.isPublished !== undefined ? { isPublished: body.isPublished } : {}),
        ...(body.playbackStatus !== undefined ? { playbackStatus: body.playbackStatus } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.genre !== undefined ? { genre: body.genre } : {}),
        ...(body.isLocal !== undefined ? { isLocal: body.isLocal } : {}),
        ...(body.offlineEligible !== undefined ? { offlineEligible: body.offlineEligible } : {}),
        ...(body.isExplicit !== undefined ? { isExplicit: body.isExplicit } : {}),
        ...(body.catalogVisibilityReason !== undefined ? { catalogVisibilityReason: body.catalogVisibilityReason } : {}),
      }, request.ip);

      return reply.send(updated);
    },
  );

  // GET /api/admin/catalog/artists
  app.get(
    "/catalog/artists",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const query = ListQuerySchema.parse(request.query);
      const result = await adminGetArtists({
        ...(query.q ? { q: query.q } : {}),
        ...(query.cursor != null ? { cursor: query.cursor } : {}),
        limit: query.limit,
      });
      return reply.send(result);
    },
  );

  // GET /api/admin/catalog/releases
  app.get(
    "/catalog/releases",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const query = ListQuerySchema.parse(request.query);
      const result = await adminGetReleases({
        ...(query.q ? { q: query.q } : {}),
        ...(query.cursor != null ? { cursor: query.cursor } : {}),
        limit: query.limit,
      });
      return reply.send(result);
    },
  );

  // GET /api/admin/users
  app.get(
    "/users",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const query = ListQuerySchema.parse(request.query);
      const result = await adminGetUsers({
        ...(query.q ? { q: query.q } : {}),
        ...(query.cursor != null ? { cursor: query.cursor } : {}),
        limit: query.limit,
      });
      return reply.send(result);
    },
  );

  // PATCH /api/admin/users/:id
  app.patch<{ Params: { id: string } }>(
    "/users/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const { id } = request.params;
      const body = PatchUserBodySchema.parse(request.body);
      const actorId = getUserId(request);
      const ipAddress = request.ip;

      // Capture before-state for audit
      const before = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      try {
        const updated = await adminUpdateUser(actorId, id, {
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.isBanned !== undefined ? { isBanned: body.isBanned } : {}),
        });

        // If role changed, stamp lastRoleChangeAt to invalidate old tokens
        if (body.role !== undefined) {
          await prisma.user.update({
            where: { id },
            data: { lastRoleChangeAt: new Date() },
          });
          await writeAuditLog(prisma, {
            actorId,
            userId: actorId,
            action: "CHANGE_ROLE",
            entityType: "User",
            entityId: id,
            before: { role: before?.role },
            after: { role: updated.role },
            ipAddress,
          });
        }

        if (body.isBanned !== undefined) {
          await writeAuditLog(prisma, {
            actorId,
            userId: actorId,
            action: body.isBanned ? "BAN_USER" : "UNBAN_USER",
            entityType: "User",
            entityId: id,
            metadata: { isBanned: body.isBanned },
            ipAddress,
          });
        }

        return reply.send(updated);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          "statusCode" in err &&
          "code" in err
        ) {
          const e = err as Error & { statusCode: number; code: string };
          const problem: ProblemDetails = { code: e.code, message: e.message };
          return reply.status(e.statusCode).send(problem);
        }
        throw err;
      }
    },
  );

  // ─── Bulk operations ─────────────────────────────────────────────────────────

  const BulkIdsSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(500),
  });

  // POST /api/admin/catalog/tracks/bulk-archive
  app.post(
    "/catalog/tracks/bulk-archive",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const body = BulkIdsSchema.parse(request.body);
      const result = await adminBulkArchiveTracks(body.ids);
      return reply.send(result);
    },
  );

  // PATCH /api/admin/catalog/tracks/bulk-publish
  app.patch(
    "/catalog/tracks/bulk-publish",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const body = BulkIdsSchema.extend({ isPublished: z.boolean() }).parse(request.body);
      const result = await adminBulkSetPublished(body.ids, body.isPublished);
      return reply.send(result);
    },
  );

  // PATCH /api/admin/catalog/tracks/bulk-set-playable
  app.patch(
    "/catalog/tracks/bulk-set-playable",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const body = BulkIdsSchema.parse(request.body);
      const result = await adminBulkSetPlayable(body.ids);
      return reply.send(result);
    },
  );

  // ─── Analytics ───────────────────────────────────────────────────────────────

  // GET /api/admin/analytics
  app.get(
    "/analytics",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const query = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }).parse(request.query);
      const result = await adminGetAnalytics(query.days);
      return reply.send(result);
    },
  );

  // ─── Feedback ────────────────────────────────────────────────────────────────

  // GET /api/admin/feedback
  app.get(
    "/feedback",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const query = z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(30),
        status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
        category: z.string().optional(),
      }).parse(request.query);

      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.appFeedback.findMany({
          where,
          take: query.limit + 1,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, displayName: true, email: true } } },
        }),
        prisma.appFeedback.count({ where }),
      ]);

      const hasMore = items.length > query.limit;
      if (hasMore) items.pop();
      return reply.send({
        items,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1]!.id : null,
        total,
      });
    },
  );

  // PATCH /api/admin/feedback/:id — update feedback status
  app.patch<{ Params: { id: string } }>(
    "/feedback/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const { id } = request.params;
      const body = z.object({
        status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
      }).parse(request.body);
      const updated = await prisma.appFeedback.update({
        where: { id },
        data: { status: body.status },
      });
      return reply.send(updated);
    },
  );

  // ─── Artists CRUD ──────────────────────────────────────────────────────────

  // GET /api/admin/catalog/artists/:id
  app.get<{ Params: { id: string } }>(
    "/catalog/artists/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const artist = await adminGetArtistById(request.params.id);
      return reply.send(artist);
    },
  );

  // PATCH /api/admin/catalog/artists/:id
  app.patch<{ Params: { id: string } }>(
    "/catalog/artists/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const body = z.object({
        name: z.string().min(1).max(200).optional(),
        bio: z.string().max(2000).nullable().optional(),
        isLocal: z.boolean().optional(),
        isVerified: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      }).refine(d =>
        d.name !== undefined || d.bio !== undefined || d.isLocal !== undefined ||
        d.isVerified !== undefined || d.isPublished !== undefined,
        { message: "At least one field is required" },
      ).parse(request.body);
      const updated = await adminPatchArtist(request.params.id, body);
      return reply.send(updated);
    },
  );

  // ─── Releases CRUD ────────────────────────────────────────────────────────

  // GET /api/admin/catalog/releases/:id
  app.get<{ Params: { id: string } }>(
    "/catalog/releases/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const release = await adminGetReleaseById(request.params.id);
      return reply.send(release);
    },
  );

  // PATCH /api/admin/catalog/releases/:id
  app.patch<{ Params: { id: string } }>(
    "/catalog/releases/:id",
    { ...adminRateLimit, preHandler: [verifyAdminRole] },
    async (request, reply) => {
      const body = z.object({
        title: z.string().min(1).max(200).optional(),
        releaseType: z.enum(["SINGLE", "EP", "ALBUM", "COMPILATION", "LIVE"]).optional(),
        releaseDate: z.string().nullable().optional(),
        isPublished: z.boolean().optional(),
      }).refine(d =>
        d.title !== undefined || d.releaseType !== undefined ||
        d.releaseDate !== undefined || d.isPublished !== undefined,
        { message: "At least one field is required" },
      ).parse(request.body);
      const updated = await adminPatchRelease(request.params.id, body);
      return reply.send(updated);
    },
  );
};
