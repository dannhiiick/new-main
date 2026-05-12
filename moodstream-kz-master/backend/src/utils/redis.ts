import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";

// Singleton Redis client shared across modules
const globalForRedis = globalThis as unknown as { _redis?: Redis };

function createRedisClient(): Redis {
  const url = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  const options: RedisOptions = {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  };
  const client = new Redis(url, options);

  client.on("error", (err: Error) => {
    // Log but don't crash — Redis is optional for play event validation in dev
    console.error("[Redis] connection error:", err.message);
  });

  return client;
}

export const redis: Redis =
  globalForRedis._redis ?? createRedisClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForRedis._redis = redis;
}
