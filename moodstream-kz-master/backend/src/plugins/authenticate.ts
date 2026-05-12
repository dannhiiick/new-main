import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyPluginAsync,
} from "fastify";
import type { UserRole } from "../domain/types.js";
import type { ProblemDetails } from "../domain/types.js";
import { prisma } from "../db/client.js";

// Extend @fastify/jwt to type the user payload
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      userId: string;
      role: UserRole;
      type: string;
      iat?: number;
    };
  }
}

export const authenticatePlugin: FastifyPluginAsync = async (
  _app: FastifyInstance,
): Promise<void> => {
  // Nothing to register; the user decorator is provided by @fastify/jwt
};

/**
 * preHandler hook that verifies JWT Bearer token.
 * Usage: { preHandler: [verifyJwt] } on protected routes.
 */
export async function verifyJwt(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (authHeader == null || !authHeader.startsWith("Bearer ")) {
    const body: ProblemDetails = {
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
    };
    await reply.status(401).send(body);
    return;
  }

  try {
    await request.jwtVerify();

    const user = request.user;
    if (user == null || typeof user !== "object" || !("type" in user)) {
      const body: ProblemDetails = {
        code: "UNAUTHORIZED",
        message: "Invalid token payload",
      };
      await reply.status(401).send(body);
      return;
    }

    const payload = user as { userId: string; role: UserRole; type: string; iat?: number };
    if (payload.type !== "access") {
      const body: ProblemDetails = {
        code: "UNAUTHORIZED",
        message: "Invalid token type",
      };
      await reply.status(401).send(body);
      return;
    }

    // Check token was issued after last role change + check ban status
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { lastRoleChangeAt: true, isBanned: true },
    });

    if (dbUser?.isBanned === true) {
      const body: ProblemDetails = {
        code: "FORBIDDEN",
        message: "Account is banned.",
      };
      await reply.status(403).send(body);
      return;
    }

    if (
      payload.iat != null &&
      dbUser?.lastRoleChangeAt != null &&
      payload.iat < Math.floor(dbUser.lastRoleChangeAt.getTime() / 1000)
    ) {
      const body: ProblemDetails = {
        code: "UNAUTHORIZED",
        message: "Token invalidated due to role change. Please log in again.",
      };
      await reply.status(401).send(body);
      return;
    }
  } catch {
    const body: ProblemDetails = {
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    };
    await reply.status(401).send(body);
  }
}

/**
 * Helper to safely extract userId from request.user after verifyJwt ran.
 */
export function getUserId(request: FastifyRequest): string {
  const user = request.user as { userId: string; role: UserRole; type: string };
  return user.userId;
}

/**
 * Helper to safely extract role from request.user after verifyJwt ran.
 */
export function getUserRole(request: FastifyRequest): UserRole {
  const user = request.user as { userId: string; role: UserRole; type: string };
  return user.role;
}
