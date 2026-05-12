import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import type { ProblemDetails } from "../../domain/types.js";
import {
  getRecommendations,
  getOrCreateProfile,
  updateProfile,
  explainRecommendation,
  saveFeedback,
  getUndergroundTracks,
} from "./recommendations.service.js";

const RecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const UndergroundQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  threshold: z.coerce.number().int().min(1).default(10_000),
  cursor: z.string().optional(),
});

const FeedbackBodySchema = z.object({
  trackId: z.string().min(1),
  kind: z.enum(["HIDE_TRACK", "HIDE_ARTIST"]),
});

const WEIGHT_KEYS = [
  "weightArtist",
  "weightGenre",
  "weightAcoustic",
  "weightKazakh",
  "weightChart",
  "weightFreshness",
] as const;

const ProfilePatchSchema = z
  .object({
    weightArtist: z.number().min(0).max(1).optional(),
    weightGenre: z.number().min(0).max(1).optional(),
    weightAcoustic: z.number().min(0).max(1).optional(),
    weightKazakh: z.number().min(0).max(1).optional(),
    weightChart: z.number().min(0).max(1).optional(),
    weightFreshness: z.number().min(0).max(1).optional(),
  })
  .refine(
    (body) => {
      // Only validate sum if all 6 weights are provided
      const provided = WEIGHT_KEYS.filter((k) => body[k] !== undefined);
      if (provided.length !== WEIGHT_KEYS.length) return true;
      const sum = WEIGHT_KEYS.reduce((acc, k) => acc + (body[k] ?? 0), 0);
      return Math.abs(sum - 1.0) < 0.001;
    },
    {
      message:
        "When all weights are provided they must sum to 1.0",
      path: [],
    },
  );

export const recommendationsModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.addHook("preHandler", verifyJwt);

  // GET /api/v1/recommendations — personalized feed with scores + reasons
  app.get("/", async (request, reply) => {
    const query = RecommendationsQuerySchema.parse(request.query);
    const userId = getUserId(request);
    const result = await getRecommendations(userId, query.limit);
    return reply.send({
      items: result.tracks.map((st) => ({
        ...st.track,
        score: st.score,
        reasons: st.reasons,
      })),
      profile: result.profile,
    });
  });

  // GET /api/v1/recommendations/underground — high quality, low plays feed
  app.get("/underground", async (request, reply) => {
    const query = UndergroundQuerySchema.parse(request.query);
    const userId = getUserId(request);
    const opts: Parameters<typeof getUndergroundTracks>[1] = {
      limit: query.limit,
      threshold: query.threshold,
    };
    if (query.cursor !== undefined) opts.cursor = query.cursor;
    const result = await getUndergroundTracks(userId, opts);
    return reply.send(result);
  });

  // GET /api/v1/recommendations/explain/:trackId — why this track
  app.get<{ Params: { trackId: string } }>(
    "/explain/:trackId",
    async (request, reply) => {
      const userId = getUserId(request);
      const { trackId } = request.params;

      const explanation = await explainRecommendation(userId, trackId);
      if (explanation == null) {
        const problem: ProblemDetails = {
          code: "NOT_FOUND",
          message: "No recommendation record found for this track",
        };
        return reply.status(404).send(problem);
      }

      return reply.send(explanation);
    },
  );

  // GET /api/v1/recommendations/profile — current weights
  app.get("/profile", async (request, reply) => {
    const userId = getUserId(request);
    const profile = await getOrCreateProfile(userId);
    return reply.send(profile);
  });

  // PATCH /api/v1/recommendations/profile — update weights
  app.patch("/profile", async (request, reply) => {
    const userId = getUserId(request);
    let parsed: z.infer<typeof ProfilePatchSchema>;
    try {
      parsed = ProfilePatchSchema.parse(request.body);
    } catch (err) {
      const problem: ProblemDetails = {
        code: "VALIDATION_ERROR",
        message: err instanceof Error ? err.message : "Invalid weight values",
      };
      return reply.status(400).send(problem);
    }

    // Strip undefined keys to satisfy exactOptionalPropertyTypes
    const weights = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v !== undefined),
    ) as Parameters<typeof updateProfile>[1];
    const updated = await updateProfile(userId, weights);
    return reply.send(updated);
  });

  // POST /api/v1/recommendations/feedback — hide track or artist
  app.post("/feedback", async (request, reply) => {
    const body = FeedbackBodySchema.parse(request.body);
    const userId = getUserId(request);

    const track = await import("../../db/client.js").then(({ prisma }) =>
      prisma.track.findUnique({ where: { id: body.trackId }, select: { id: true } }),
    );

    if (track == null) {
      const problem: ProblemDetails = {
        code: "NOT_FOUND",
        message: "Track not found",
      };
      return reply.status(404).send(problem);
    }

    await saveFeedback(userId, body.trackId, body.kind);
    return reply.status(204).send();
  });

  // Keep legacy /for-you route as alias for backward compat
  app.get("/for-you", async (request, reply) => {
    const query = RecommendationsQuerySchema.parse(request.query);
    const userId = getUserId(request);
    const result = await getRecommendations(userId, query.limit);
    return reply.send({
      items: result.tracks.map((st) => st.track),
    });
  });
};
