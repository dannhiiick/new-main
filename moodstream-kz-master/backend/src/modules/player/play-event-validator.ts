import type { Redis } from "ioredis";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum fraction of track that must be played for a COMPLETE to be legitimate */
const COMPLETE_MIN_FRACTION = 0.8;

/** Seconds below which a SKIP is a negative signal */
const SKIP_PENALTY_THRESHOLD_SEC = 30;

/** Redis TTL (seconds) for sessionId dedup window */
const SESSION_DEDUP_TTL_SEC = 5 * 60; // 5 minutes

/** Max play events per IP per hour (sliding window) */
const IP_RATE_LIMIT_MAX = 50;
const IP_RATE_LIMIT_WINDOW_SEC = 60 * 60; // 1 hour

/** Max play events per user per day */
const USER_RATE_LIMIT_MAX = 100;
const USER_RATE_LIMIT_WINDOW_SEC = 24 * 60 * 60; // 24 hours

/** Allowed clock skew between client and server (ms) */
const TIMESTAMP_SKEW_MS = 5 * 60 * 1000; // ±5 minutes

/** Window for bot detection (unique tracks) */
const BOT_WINDOW_SEC = 10 * 60; // 10 minutes
const BOT_UNIQUE_TRACKS_THRESHOLD = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayEventAction = "START" | "PAUSE" | "RESUME" | "COMPLETE" | "SKIP";

export interface ValidationInput {
  userId: string;
  trackId: string;
  action: PlayEventAction;
  position: number;
  duration: number;
  sessionId: string;
  clientTimestamp: number;
  ip: string;
}

export interface ValidationResult {
  allowed: boolean;
  suspicious: boolean;
  /** Human-readable rejection reason, present only when allowed=false */
  reason?: string;
}

// ─── Validator ────────────────────────────────────────────────────────────────

export class PlayEventValidator {
  constructor(private readonly redis: Redis) {}

  async validate(input: ValidationInput): Promise<ValidationResult> {
    const {
      userId,
      trackId,
      action,
      position,
      duration,
      sessionId,
      clientTimestamp,
      ip,
    } = input;

    // Rule 1: COMPLETE only counts if position >= 0.8 * duration
    if (action === "COMPLETE" && duration > 0) {
      if (position < COMPLETE_MIN_FRACTION * duration) {
        return {
          allowed: false,
          suspicious: true,
          reason: "COMPLETE event at position below 80% of track duration",
        };
      }
    }

    // Rule 6: Timestamp sanity — clientTimestamp within ±5 min of server time
    const serverNow = Date.now();
    if (Math.abs(clientTimestamp - serverNow) > TIMESTAMP_SKEW_MS) {
      return {
        allowed: false,
        suspicious: true,
        reason: "Client timestamp deviates more than 5 minutes from server time",
      };
    }

    // Redis-based checks — wrapped in try/catch so Redis outages don't block plays
    try {
      // Rule 3: Session dedup — same sessionId cannot generate 2 START events for same track within 5 min
      if (action === "START") {
        const sessionKey = `pe:session:${sessionId}:${trackId}`;
        const alreadyExists = await this.redis.set(
          sessionKey,
          "1",
          "EX",
          SESSION_DEDUP_TTL_SEC,
          "NX",
        );
        if (alreadyExists === null) {
          // Key already existed — duplicate START
          return {
            allowed: false,
            suspicious: true,
            reason: "Duplicate START event for same session and track within 5 minutes",
          };
        }
      }

      // Rule 4: IP rate limit — max 50 play events per IP per hour (sliding window)
      const ipKey = `pe:ip:${ip}`;
      const ipCount = await this.incrementSlidingWindow(
        ipKey,
        IP_RATE_LIMIT_WINDOW_SEC,
      );
      if (ipCount > IP_RATE_LIMIT_MAX) {
        return {
          allowed: false,
          suspicious: true,
          reason: "IP play event rate limit exceeded (50/hour)",
        };
      }

      // Rule 5: User rate limit — max 100 play events per user per day
      const userKey = `pe:user:${userId}`;
      const userCount = await this.incrementSlidingWindow(
        userKey,
        USER_RATE_LIMIT_WINDOW_SEC,
      );
      if (userCount > USER_RATE_LIMIT_MAX) {
        return {
          allowed: false,
          suspicious: true,
          reason: "User play event rate limit exceeded (100/day)",
        };
      }

      // Rule 7: Bot detection — user plays > 20 different tracks within 10 min
      const botKey = `pe:bot:${userId}`;
      await this.redis.sadd(botKey, trackId);
      // Set TTL only on first add (if it didn't have one)
      const ttl = await this.redis.ttl(botKey);
      if (ttl === -1) {
        await this.redis.expire(botKey, BOT_WINDOW_SEC);
      }
      const uniqueTracksInWindow = await this.redis.scard(botKey);
      if (uniqueTracksInWindow > BOT_UNIQUE_TRACKS_THRESHOLD) {
        // Flag as suspicious but still allow the event to be stored (for audit)
        return {
          allowed: true,
          suspicious: true,
        };
      }
    } catch {
      // Redis unavailable — allow the event but don't flag as suspicious
      // This prevents Redis downtime from blocking all plays
    }

    // Rule 2: SKIP at position < 30s = negative signal (suspicious=true, still stored)
    if (action === "SKIP" && position < SKIP_PENALTY_THRESHOLD_SEC) {
      return { allowed: true, suspicious: false }; // stored with action=SKIP, penalty applied at scoring time
    }

    return { allowed: true, suspicious: false };
  }

  /**
   * Sliding window counter: increment a counter key with TTL reset on first touch.
   * Returns the new count.
   */
  private async incrementSlidingWindow(key: string, windowSec: number): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSec, "NX"); // only set TTL if not already set
    const results = await pipeline.exec();
    const countResult = results?.[0];
    if (countResult == null) return 0;
    return (countResult[1] as number) ?? 0;
  }
}
