import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import { searchByMood } from "./mood-machine.service.js";

const MoodQuerySchema = z.object({
  q: z.string().min(3).max(200),
  limit: z.coerce.number().int().min(1).max(30).default(15),
});

export const moodMachineModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // GET /api/v1/mood?q=rainy+evening+sad+coffee
  app.get("/", async (request, reply) => {
    const query = MoodQuerySchema.safeParse(request.query);
    if (!query.success) {
      const problem: ProblemDetails = { code: "VALIDATION_ERROR", message: "Query parameter 'q' is required (min 3 chars)" };
      return reply.status(400).send(problem);
    }

    if (!process.env["ANTHROPIC_API_KEY"]) {
      const problem: ProblemDetails = { code: "FEATURE_UNAVAILABLE", message: "Mood Machine requires ANTHROPIC_API_KEY" };
      return reply.status(503).send(problem);
    }

    const userId = getUserId(request);
    const result = await searchByMood(query.data.q, userId, query.data.limit);
    return reply.send(result);
  });
};
