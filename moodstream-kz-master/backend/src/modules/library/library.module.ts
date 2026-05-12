import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  getLikedTracks,
  getListeningHistory,
  likeTrack,
  unlikeTrack,
  isTrackLiked,
  TrackNotFoundError,
  AlreadyLikedError,
} from "./library.service.js";

const LikeBodySchema = z.object({
  trackId: z.string().min(1),
});

const LikedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const libraryModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // All library routes require authentication
  app.addHook("preHandler", verifyJwt);

  // GET /liked — paginated liked tracks
  app.get("/liked", async (request, reply) => {
    const query = LikedQuerySchema.parse(request.query);
    const result = await getLikedTracks(
      getUserId(request),
      query.cursor,
      query.limit,
    );
    return reply.send(result);
  });

  // POST /like — like a track
  app.post("/like", async (request, reply) => {
    const body = LikeBodySchema.parse(request.body);
    try {
      await likeTrack(getUserId(request), body.trackId);
      return reply.status(201).send({ liked: true });
    } catch (err) {
      if (err instanceof TrackNotFoundError) {
        const problem: ProblemDetails = {
          code: "NOT_FOUND",
          message: err.message,
        };
        return reply.status(404).send(problem);
      }
      if (err instanceof AlreadyLikedError) {
        const problem: ProblemDetails = {
          code: "ALREADY_LIKED",
          message: err.message,
        };
        return reply.status(409).send(problem);
      }
      throw err;
    }
  });

  // DELETE /like/:trackId — unlike a track
  app.delete<{ Params: { trackId: string } }>(
    "/like/:trackId",
    async (request, reply) => {
      await unlikeTrack(getUserId(request), request.params.trackId);
      return reply.status(204).send();
    },
  );

  // GET /history — paginated listening history
  app.get("/history", async (request, reply) => {
    const query = request.query as { cursor?: string; limit?: string };
    const cursor = query.cursor;
    const limit = Math.min(Number(query.limit ?? 20), 50);
    const result = await getListeningHistory(getUserId(request), cursor, limit);
    return reply.send(result);
  });

  // GET /liked/:trackId — check if track is liked
  app.get<{ Params: { trackId: string } }>(
    "/liked/:trackId",
    async (request, reply) => {
      const liked = await isTrackLiked(
        getUserId(request),
        request.params.trackId,
      );
      return reply.send({ liked });
    },
  );
};
