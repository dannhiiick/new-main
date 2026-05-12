import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  startTestSession,
  getActiveSession,
  endTestSession,
  recordInteraction,
  getSessionLikedTracks,
  ActiveSessionExistsError,
  SessionNotFoundError,
} from "./test-mode.service.js";

const EndSessionSchema = z.object({
  action: z.enum(["keep", "discard"]),
});

const InteractionSchema = z.object({
  trackId: z.string().min(1),
  action: z.enum(["LIKE", "SKIP", "PLAY", "UNLIKE"]),
});

export const testModeModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // POST /api/v1/test-mode/start — begin isolated test session
  app.post("/start", async (request, reply) => {
    const userId = getUserId(request);
    try {
      const session = await startTestSession(userId);
      return reply.status(201).send(session);
    } catch (err) {
      if (err instanceof ActiveSessionExistsError) {
        const problem: ProblemDetails = { code: "SESSION_EXISTS", message: err.message };
        return reply.status(409).send(problem);
      }
      throw err;
    }
  });

  // GET /api/v1/test-mode/current — get active session info
  app.get("/current", async (request, reply) => {
    const userId = getUserId(request);
    const session = await getActiveSession(userId);
    if (session == null) {
      const problem: ProblemDetails = { code: "NO_ACTIVE_SESSION", message: "No active test session" };
      return reply.status(404).send(problem);
    }
    return reply.send(session);
  });

  // POST /api/v1/test-mode/end — end session, optionally transfer likes
  app.post("/end", async (request, reply) => {
    const userId = getUserId(request);
    const body = EndSessionSchema.parse(request.body);
    try {
      const result = await endTestSession(userId, body.action);
      return reply.send(result);
    } catch (err) {
      if (err instanceof SessionNotFoundError) {
        const problem: ProblemDetails = { code: "NO_ACTIVE_SESSION", message: err.message };
        return reply.status(404).send(problem);
      }
      throw err;
    }
  });

  // POST /api/v1/test-mode/interact — record interaction in active session
  app.post("/interact", async (request, reply) => {
    const userId = getUserId(request);
    const body = InteractionSchema.parse(request.body);
    try {
      const result = await recordInteraction(userId, body.trackId, body.action);
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof SessionNotFoundError) {
        const problem: ProblemDetails = { code: "NO_ACTIVE_SESSION", message: err.message };
        return reply.status(404).send(problem);
      }
      throw err;
    }
  });

  // GET /api/v1/test-mode/liked — tracks liked in the active session
  app.get("/liked", async (request, reply) => {
    const userId = getUserId(request);
    const tracks = await getSessionLikedTracks(userId);
    return reply.send({ items: tracks });
  });
};
