import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  upsertPublicProfile,
  listPublicProfiles,
  startCloneSession,
  endCloneSession,
  getActiveCloneSession,
  getCloneRecommendations,
  ProfileNotFoundError,
  ProfilePrivateError,
  CloneSessionExistsError,
} from "./taste-clone.service.js";

const ProfilePatchSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export const tasteCloneModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // GET /api/v1/taste-clone/profiles — browse public profiles
  app.get("/profiles", async (request, reply) => {
    const profiles = await listPublicProfiles();
    return reply.send({ items: profiles });
  });

  // PUT /api/v1/taste-clone/my-profile — create/update own profile
  app.put("/my-profile", async (request, reply) => {
    const userId = getUserId(request);
    const body = ProfilePatchSchema.parse(request.body);
    const profile = await upsertPublicProfile(userId, body);
    return reply.send(profile);
  });

  // POST /api/v1/taste-clone/sessions — start a clone session
  app.post<{ Body: { sourceProfileId: string } }>("/sessions", async (request, reply) => {
    const userId = getUserId(request);
    const { sourceProfileId } = z.object({ sourceProfileId: z.string().min(1) }).parse(request.body);
    try {
      const session = await startCloneSession(userId, sourceProfileId);
      return reply.status(201).send(session);
    } catch (err) {
      if (err instanceof ProfileNotFoundError) {
        const problem: ProblemDetails = { code: "PROFILE_NOT_FOUND", message: err.message };
        return reply.status(404).send(problem);
      }
      if (err instanceof ProfilePrivateError) {
        const problem: ProblemDetails = { code: "PROFILE_PRIVATE", message: err.message };
        return reply.status(403).send(problem);
      }
      if (err instanceof CloneSessionExistsError) {
        const problem: ProblemDetails = { code: "SESSION_EXISTS", message: err.message };
        return reply.status(409).send(problem);
      }
      throw err;
    }
  });

  // DELETE /api/v1/taste-clone/sessions/active — end active clone session
  app.delete("/sessions/active", async (request, reply) => {
    const userId = getUserId(request);
    await endCloneSession(userId);
    return reply.status(204).send();
  });

  // GET /api/v1/taste-clone/sessions/active — check active session
  app.get("/sessions/active", async (request, reply) => {
    const userId = getUserId(request);
    const session = await getActiveCloneSession(userId);
    if (!session) {
      const problem: ProblemDetails = { code: "NO_ACTIVE_SESSION", message: "No active clone session" };
      return reply.status(404).send(problem);
    }
    return reply.send(session);
  });

  // GET /api/v1/taste-clone/recommendations — blended recs (clone-aware)
  app.get("/recommendations", async (request, reply) => {
    const userId = getUserId(request);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) })
      .parse(request.query);
    const result = await getCloneRecommendations(userId, query.limit);
    return reply.send({
      items: result.tracks.map((st) => ({ ...st.track, score: st.score, reasons: st.reasons })),
    });
  });
};
