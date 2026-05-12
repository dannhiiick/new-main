import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { ProblemDetails } from "../../domain/types.js";
import { getChart } from "./charts.service.js";

export const chartsModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // GET /api/v1/charts/:slug — public, no auth required
  app.get<{ Params: { slug: string } }>(
    "/:slug",
    async (request, reply) => {
      const { slug } = request.params;
      const chart = await getChart(slug);

      if (chart == null) {
        const body: ProblemDetails = {
          code: "NOT_FOUND",
          message: `Chart '${slug}' not found`,
        };
        return reply.status(404).send(body);
      }

      return reply.send(chart);
    },
  );
};
