import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { ProblemDetails } from "../../domain/types.js";
import { getLyrics } from "./lyrics.service.js";

export const lyricsModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // GET /api/v1/lyrics/:trackId — public endpoint, no auth required
  app.get<{ Params: { trackId: string } }>("/:trackId", async (request, reply) => {
    const { trackId } = request.params;

    if (!trackId || trackId.length < 1) {
      const problem: ProblemDetails = { code: "INVALID_TRACK_ID", message: "Invalid track ID" };
      return reply.status(400).send(problem);
    }

    const result = await getLyrics(trackId);
    return reply.send(result);
  });
};
