import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  getGenreBridge,
  getWeeklyBridgeSuggestion,
  GenreNotFoundError,
} from "./genre-bridges.service.js";

const BridgeQuerySchema = z.object({
  from: z.string().min(1).max(50),
  to: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const genreBridgesModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // GET /api/v1/genre-bridges?from=pop&to=jazz
  app.get("/", async (request, reply) => {
    const query = BridgeQuerySchema.parse(request.query);
    const userId = getUserId(request);
    try {
      const result = await getGenreBridge(query.from, query.to, userId, query.limit);
      return reply.send(result);
    } catch (err) {
      if (err instanceof GenreNotFoundError) {
        const problem: ProblemDetails = { code: "GENRE_NOT_FOUND", message: err.message };
        return reply.status(404).send(problem);
      }
      throw err;
    }
  });

  // GET /api/v1/genre-bridges/suggestion — weekly suggestion based on user's top genres
  app.get("/suggestion", async (request, reply) => {
    const userId = getUserId(request);
    const result = await getWeeklyBridgeSuggestion(userId);
    return reply.send(result);
  });
};
