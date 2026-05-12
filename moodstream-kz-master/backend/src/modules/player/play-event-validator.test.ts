import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlayEventValidator, type ValidationInput } from "./play-event-validator.js";
import type { Redis } from "ioredis";

// ─── In-memory Redis mock ─────────────────────────────────────────────────────

function createRedisMock(): Redis {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const ttls = new Map<string, number>();

  return {
    set: vi.fn(async (key: string, _val: string, ...args: unknown[]) => {
      // set(key, val, 'EX', ttl, 'NX') pattern
      const isNx = args.includes("NX");
      if (isNx && store.has(key)) {
        return null; // NX: not set because key exists
      }
      store.set(key, _val);
      return "OK";
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    incr: vi.fn(async (key: string) => {
      const current = parseInt(store.get(key) ?? "0", 10);
      const next = current + 1;
      store.set(key, String(next));
      return next;
    }),
    expire: vi.fn(async (key: string, ttl: number) => {
      ttls.set(key, ttl);
      return 1;
    }),
    ttl: vi.fn(async (key: string) => (ttls.has(key) ? ttls.get(key)! : -1)),
    sadd: vi.fn(async (key: string, member: string) => {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key)!.add(member);
      return 1;
    }),
    scard: vi.fn(async (key: string) => sets.get(key)?.size ?? 0),
    pipeline: vi.fn(() => {
      const ops: Array<() => Promise<[null, number]>> = [];
      const pipe = {
        incr: (key: string) => {
          ops.push(async () => {
            const current = parseInt(store.get(key) ?? "0", 10);
            const next = current + 1;
            store.set(key, String(next));
            return [null, next] as [null, number];
          });
          return pipe;
        },
        expire: (key: string, _ttl: number, _flag?: string) => {
          ops.push(async () => {
            if (!ttls.has(key)) ttls.set(key, _ttl);
            return [null, 1] as [null, number];
          });
          return pipe;
        },
        exec: async () => {
          const results = [];
          for (const op of ops) {
            results.push(await op());
          }
          return results;
        },
      };
      return pipe;
    }),
  } as unknown as Redis;
}

// ─── Shared valid input ───────────────────────────────────────────────────────

function makeInput(overrides: Partial<ValidationInput> = {}): ValidationInput {
  return {
    userId: "user-1",
    trackId: "track-1",
    action: "START",
    position: 0,
    duration: 180,
    sessionId: `session-${Math.random().toString(36).slice(2)}`,
    clientTimestamp: Date.now(),
    ip: "127.0.0.1",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PlayEventValidator", () => {
  let redis: Redis;
  let validator: PlayEventValidator;

  beforeEach(() => {
    redis = createRedisMock();
    validator = new PlayEventValidator(redis);
  });

  // ── Rule 0: valid event passes ────────────────────────────────────────────

  it("allows a valid START event", async () => {
    const result = await validator.validate(makeInput());
    expect(result.allowed).toBe(true);
    expect(result.suspicious).toBe(false);
  });

  it("allows a COMPLETE event when position >= 80% of duration", async () => {
    const result = await validator.validate(
      makeInput({ action: "COMPLETE", position: 150, duration: 180 }),
    );
    expect(result.allowed).toBe(true);
  });

  // ── Rule 1: COMPLETE below 80% is rejected ────────────────────────────────

  it("rejects COMPLETE when position < 80% of duration", async () => {
    const result = await validator.validate(
      makeInput({ action: "COMPLETE", position: 10, duration: 180 }),
    );
    expect(result.allowed).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toMatch(/80%/);
  });

  it("allows COMPLETE when duration is 0 (unknown)", async () => {
    const result = await validator.validate(
      makeInput({ action: "COMPLETE", position: 0, duration: 0 }),
    );
    expect(result.allowed).toBe(true);
  });

  // ── Rule 2: SKIP signal ───────────────────────────────────────────────────

  it("allows SKIP at position < 30s (stored, penalty applied at scoring time)", async () => {
    const result = await validator.validate(
      makeInput({ action: "SKIP", position: 5 }),
    );
    expect(result.allowed).toBe(true);
  });

  it("allows SKIP at position >= 30s", async () => {
    const result = await validator.validate(
      makeInput({ action: "SKIP", position: 60 }),
    );
    expect(result.allowed).toBe(true);
  });

  // ── Rule 3: Session dedup ─────────────────────────────────────────────────

  it("allows first START for a sessionId+trackId pair", async () => {
    const result = await validator.validate(makeInput({ sessionId: "sess-dedup-test" }));
    expect(result.allowed).toBe(true);
  });

  it("rejects duplicate START for same sessionId+trackId", async () => {
    const input = makeInput({ sessionId: "sess-dedup-dup" });
    await validator.validate(input);
    const result = await validator.validate(input);
    expect(result.allowed).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toMatch(/[Dd]uplicate/);
  });

  it("allows same sessionId with a different trackId", async () => {
    const sessionId = "sess-multi-track";
    await validator.validate(makeInput({ sessionId, trackId: "track-a" }));
    const result = await validator.validate(makeInput({ sessionId, trackId: "track-b" }));
    expect(result.allowed).toBe(true);
  });

  // ── Rule 6: Timestamp skew ────────────────────────────────────────────────

  it("rejects events with client timestamp 6 minutes in the past", async () => {
    const result = await validator.validate(
      makeInput({ clientTimestamp: Date.now() - 6 * 60 * 1000 }),
    );
    expect(result.allowed).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toMatch(/5 minutes/);
  });

  it("rejects events with client timestamp 6 minutes in the future", async () => {
    const result = await validator.validate(
      makeInput({ clientTimestamp: Date.now() + 6 * 60 * 1000 }),
    );
    expect(result.allowed).toBe(false);
    expect(result.suspicious).toBe(true);
  });

  it("allows events within ±4 minutes of server time", async () => {
    const result = await validator.validate(
      makeInput({ clientTimestamp: Date.now() + 4 * 60 * 1000 }),
    );
    expect(result.allowed).toBe(true);
  });

  // ── Rule 4: IP rate limit ─────────────────────────────────────────────────

  it("rejects events when IP rate limit is exceeded (51st event)", async () => {
    // Build a redis mock where the IP sliding window always returns 51
    let pipelineCallCount = 0;
    const ipLimitedRedis: Redis = {
      set: vi.fn(async () => "OK"),
      sadd: vi.fn(async () => 1),
      scard: vi.fn(async () => 1),
      ttl: vi.fn(async () => 100),
      expire: vi.fn(async () => 1),
      pipeline: vi.fn(() => {
        pipelineCallCount++;
        const isIpCall = pipelineCallCount === 1;
        const countToReturn = isIpCall ? 51 : 1;
        const pipeObj: Record<string, unknown> = {};
        pipeObj["incr"] = () => pipeObj;
        pipeObj["expire"] = () => pipeObj;
        pipeObj["exec"] = async () => [[null, countToReturn], [null, 1]];
        return pipeObj as unknown as ReturnType<Redis["pipeline"]>;
      }),
    } as unknown as Redis;

    const v = new PlayEventValidator(ipLimitedRedis);
    const result = await v.validate(makeInput());
    expect(result.allowed).toBe(false);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toMatch(/IP/);
  });

  // ── Redis failure resilience ──────────────────────────────────────────────

  it("allows event when Redis throws (fails open)", async () => {
    const brokenRedis = {
      pipeline: vi.fn(() => {
        throw new Error("Redis unavailable");
      }),
    } as unknown as Redis;

    const v = new PlayEventValidator(brokenRedis);
    const result = await v.validate(makeInput());
    // Timestamp check passes, then Redis throws — should allow (fail open)
    expect(result.allowed).toBe(true);
  });

  // ── Rule 7: Bot detection (suspicious but allowed) ────────────────────────

  it("flags as suspicious when user plays more than 20 unique tracks in window", async () => {
    const botRedis = createRedisMock();
    vi.spyOn(botRedis, "scard").mockResolvedValue(21);
    vi.spyOn(botRedis, "ttl").mockResolvedValue(-1);

    const v = new PlayEventValidator(botRedis);
    const result = await v.validate(makeInput({ sessionId: "unique-bot-session" }));
    expect(result.allowed).toBe(true);
    expect(result.suspicious).toBe(true);
  });
});
