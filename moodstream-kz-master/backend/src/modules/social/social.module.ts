import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  followArtist,
  unfollowArtist,
  getFollowedArtists,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getSocialFeed,
  FriendNotFoundError,
  AlreadyFriendsError,
} from "./social.service.js";

const FeedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const socialModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // ── Artist follows ──────────────────────────────────────────────────────

  app.post<{ Params: { artistId: string } }>(
    "/artists/:artistId/follow",
    async (request, reply) => {
      const userId = getUserId(request);
      await followArtist(userId, request.params.artistId);
      return reply.status(204).send();
    },
  );

  app.delete<{ Params: { artistId: string } }>(
    "/artists/:artistId/follow",
    async (request, reply) => {
      const userId = getUserId(request);
      await unfollowArtist(userId, request.params.artistId);
      return reply.status(204).send();
    },
  );

  app.get("/artists/following", async (request, reply) => {
    const userId = getUserId(request);
    const artists = await getFollowedArtists(userId);
    return reply.send({ items: artists });
  });

  app.get<{ Params: { artistId: string } }>(
    "/artists/:artistId/follow",
    async (request, reply) => {
      const userId = getUserId(request);
      const { prisma } = await import("../../db/client.js");
      const exists = await prisma.artistFollow.findUnique({
        where: { userId_artistId: { userId, artistId: request.params.artistId } },
        select: { artistId: true },
      });
      return reply.send({ following: exists !== null });
    },
  );

  // ── Friends ─────────────────────────────────────────────────────────────

  app.post<{ Params: { userId: string } }>(
    "/friends/:userId/request",
    async (request, reply) => {
      const requesterId = getUserId(request);
      try {
        await sendFriendRequest(requesterId, request.params.userId);
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof FriendNotFoundError) {
          const problem: ProblemDetails = { code: "USER_NOT_FOUND", message: err.message };
          return reply.status(404).send(problem);
        }
        if (err instanceof AlreadyFriendsError) {
          const problem: ProblemDetails = { code: "ALREADY_FRIENDS", message: err.message };
          return reply.status(409).send(problem);
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { userId: string } }>(
    "/friends/:userId/accept",
    async (request, reply) => {
      const userId = getUserId(request);
      await acceptFriendRequest(userId, request.params.userId);
      return reply.status(204).send();
    },
  );

  app.get("/friends", async (request, reply) => {
    const userId = getUserId(request);
    const friends = await getFriends(userId);
    return reply.send({ items: friends });
  });

  // ── Feed ─────────────────────────────────────────────────────────────────

  app.get("/feed", async (request, reply) => {
    const query = FeedQuerySchema.parse(request.query);
    const userId = getUserId(request);
    const result = await getSocialFeed(userId, query.limit);
    return reply.send(result);
  });
};
