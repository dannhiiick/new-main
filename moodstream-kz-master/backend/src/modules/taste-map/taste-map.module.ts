import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import { getTasteMap } from "./taste-map.service.js";

export const tasteMapModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // GET /api/v1/taste-map — user's genre distribution
  app.get("/", async (request, reply) => {
    const userId = getUserId(request);
    const result = await getTasteMap(userId);
    return reply.send(result);
  });
};
