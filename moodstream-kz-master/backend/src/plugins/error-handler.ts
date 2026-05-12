import type { FastifyInstance, FastifyError, FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js";
import type { ProblemDetails } from "../domain/types.js";

export const errorHandler: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  app.setErrorHandler(
    (error: FastifyError | Error, _request, reply): void => {
      // Zod validation errors → 400
      if (error instanceof ZodError) {
        const body: ProblemDetails = {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: {
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
              code: issue.code,
            })),
          },
        };
        void reply.status(400).send(body);
        return;
      }

      // Prisma not-found error → 404
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        const body: ProblemDetails = {
          code: "NOT_FOUND",
          message: "The requested resource was not found",
        };
        void reply.status(404).send(body);
        return;
      }

      // Fastify validation errors (schema-based) → 400
      const fastifyError = error as FastifyError;
      if (fastifyError.statusCode === 400 || fastifyError.validation != null) {
        const body: ProblemDetails = {
          code: "VALIDATION_ERROR",
          message: fastifyError.message,
        };
        void reply.status(400).send(body);
        return;
      }

      // Known HTTP errors with explicit status codes (4xx)
      if (
        fastifyError.statusCode != null &&
        fastifyError.statusCode >= 400 &&
        fastifyError.statusCode < 500
      ) {
        const body: ProblemDetails = {
          code: "CLIENT_ERROR",
          message: fastifyError.message,
        };
        void reply.status(fastifyError.statusCode).send(body);
        return;
      }

      // All other errors → 500
      app.log.error(error);
      const body: ProblemDetails = {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      };
      void reply.status(500).send(body);
    },
  );
};
