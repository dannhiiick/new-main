import { z } from "zod";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import jwt, { type FastifyJwtNamespace } from "@fastify/jwt";
import { errorHandler } from "./plugins/error-handler.js";
import { authenticatePlugin } from "./plugins/authenticate.js";
import { authModule } from "./modules/auth/auth.module.js";
import { catalogModule } from "./modules/catalog/catalog.module.js";
import { playerModule } from "./modules/player/player.module.js";
import { libraryModule } from "./modules/library/library.module.js";
import { adminModule } from "./modules/admin/admin.module.js";
import { chartsModule } from "./modules/charts/charts.module.js";
import { recommendationsModule } from "./modules/recommendations/recommendations.module.js";
import { ingestionModule } from "./modules/ingestion/ingestion.module.js";
import { playlistsModule } from "./modules/playlists/playlists.module.js";
import { testModeModule } from "./modules/test-mode/test-mode.module.js";
import { tasteMapModule } from "./modules/taste-map/taste-map.module.js";
import { genreBridgesModule } from "./modules/genre-bridges/genre-bridges.module.js";
import { socialModule } from "./modules/social/social.module.js";
import { lyricsModule } from "./modules/lyrics/lyrics.module.js";
import { tasteCloneModule } from "./modules/taste-clone/taste-clone.module.js";
import { moodMachineModule } from "./modules/mood-machine/mood-machine.module.js";
import {
  startChartsWorker,
  scheduleChartsRecalculation,
  stopChartsWorker,
} from "./modules/charts/charts.worker.js";
import { redis } from "./utils/redis.js";
import { prisma } from "./db/client.js";

// Augment FastifyInstance with the jwtRefresh namespace methods
declare module "fastify" {
  interface FastifyInstance
    extends FastifyJwtNamespace<{ namespace: "jwtRefresh" }> {}
}


const app = Fastify({
  logger: {
    level: process.env["NODE_ENV"] === "production" ? "warn" : "info",
  },
  bodyLimit: 10 * 1024, // 10 KB max JSON body
});

const isDev = process.env["NODE_ENV"] !== "production";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// CORS_ORIGIN can be a single URL or comma-separated list, e.g.:
//   https://moodspot-admin.onrender.com,https://moodspot-kz.onrender.com
const allowedOrigins = process.env["CORS_ORIGIN"]
  ? process.env["CORS_ORIGIN"].split(",").map(s => s.trim()).filter(Boolean)
  : [];

await app.register(cors, {
  origin: isDev
    ? true
    : allowedOrigins.length > 0
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin)) {
            cb(null, true);
          } else {
            cb(new Error("Not allowed by CORS"), false);
          }
        }
      : false,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Secret", "Accept-Language", "X-Territory"],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
});

// ─── Security Headers ─────────────────────────────────────────────────────────
await app.register(helmet, {
  contentSecurityPolicy: false, // API — no HTML served
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Global default: 200 req/min per IP
// Auth routes override: 10 req/min (set via config in auth.module)
// Admin routes override: 60 req/min (set via config in admin.module)
await app.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
  errorResponseBuilder: (_request, context) => ({
    code: "RATE_LIMITED",
    message: `Rate limit exceeded. Retry after ${String(context.after)}`,
  }),
});

// ─── JWT (access tokens) ──────────────────────────────────────────────────────
await app.register(jwt, {
  secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-access-secret-change-me",
  sign: { expiresIn: "15m" },
});

// ─── JWT (refresh tokens) — separate namespace ────────────────────────────────
await app.register(jwt, {
  secret: process.env["JWT_REFRESH_SECRET"] ?? "dev-refresh-secret-change-me",
  sign: { expiresIn: "30d" },
  namespace: "jwtRefresh",
});

// ─── Cookie plugin ────────────────────────────────────────────────────────────
await app.register(cookie);

// ─── Plugins ──────────────────────────────────────────────────────────────────
await app.register(errorHandler);
await app.register(authenticatePlugin);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", async () => {
  return {
    status: "ok",
    service: "moodstream-backend",
    ts: new Date().toISOString(),
  };
});

// ─── Modules ──────────────────────────────────────────────────────────────────
await app.register(authModule, { prefix: "/api/v1/auth" });
await app.register(catalogModule, { prefix: "/api/v1/catalog" });
await app.register(playerModule, { prefix: "/api/v1" });
await app.register(libraryModule, { prefix: "/api/v1/library" });
await app.register(adminModule, { prefix: "/api/admin" });
await app.register(chartsModule, { prefix: "/api/v1/charts" });
await app.register(recommendationsModule, { prefix: "/api/v1/recommendations" });
await app.register(ingestionModule, { prefix: "/api/admin/ingestion" });
await app.register(playlistsModule, { prefix: "/api/v1/playlists" });
await app.register(testModeModule, { prefix: "/api/v1/test-mode" });
await app.register(tasteMapModule, { prefix: "/api/v1/taste-map" });
await app.register(genreBridgesModule, { prefix: "/api/v1/genre-bridges" });
await app.register(socialModule, { prefix: "/api/v1/social" });
await app.register(lyricsModule, { prefix: "/api/v1/lyrics" });
await app.register(tasteCloneModule, { prefix: "/api/v1/taste-clone" });
await app.register(moodMachineModule, { prefix: "/api/v1/mood" });

// ─── User Feedback ────────────────────────────────────────────────────────────
// POST /api/v1/feedback — authenticated users can submit feedback
app.post(
  "/api/v1/feedback",
  async (request, reply) => {
    const FeedbackSchema = z.object({
      category: z.enum(["BUG", "COMPLAINT", "FEATURE_REQUEST", "OTHER"]),
      message: z.string().min(1).max(2000),
      appVersion: z.string().optional(),
      platform: z.string().optional(),
    });
    const body = FeedbackSchema.parse(request.body);

    let userId: string | null = null;
    try {
      const payload = await request.jwtVerify<{ userId: string }>();
      userId = payload.userId ?? null;
    } catch {
      // Anonymous feedback is allowed
    }

    const feedback = await prisma.appFeedback.create({
      data: {
        category: body.category,
        message: body.message,
        appVersion: body.appVersion ?? null,
        platform: body.platform ?? null,
        ...(userId ? { userId } : {}),
      },
    });

    return reply.status(201).send({ id: feedback.id });
  },
);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.setNotFoundHandler((_request, reply) => {
  void reply.status(404).send({ code: "NOT_FOUND", message: "Route not found" });
});

// ─── Charts worker (BullMQ) ───────────────────────────────────────────────────
startChartsWorker();
await scheduleChartsRecalculation();

// ─── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env["PORT"] ?? 3000);
const host = process.env["HOST"] ?? "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`MoodStream backend running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`[shutdown] Received ${signal} — shutting down gracefully`);
  try {
    await app.close();           // stop accepting new HTTP requests
    await stopChartsWorker();    // wait for in-flight BullMQ jobs to finish
    await redis.quit();          // close Redis connection
    await prisma.$disconnect();  // close DB connection pool
    console.log("[shutdown] Clean exit");
    process.exit(0);
  } catch (err) {
    console.error("[shutdown] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT",  () => { void shutdown("SIGINT"); });
