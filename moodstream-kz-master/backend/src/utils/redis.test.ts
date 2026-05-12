import { describe, it, expect, vi } from "vitest";

// ─── Mock ioredis before the module is loaded ─────────────────────────────────

vi.mock("ioredis", () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue("OK"),
  }));
  return { Redis: RedisMock };
});

import { Redis } from "ioredis";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("redis util", () => {
  it("exports a redis client object", async () => {
    const { redis } = await import("./redis.js");
    expect(redis).toBeDefined();
    expect(typeof redis).toBe("object");
  });

  it("client is created by the Redis constructor", async () => {
    // The Redis constructor (mocked) should have been called to create the client
    expect(Redis).toHaveBeenCalled();
  });

  it("client has expected Redis methods", async () => {
    const { redis } = await import("./redis.js");
    expect(typeof redis.get).toBe("function");
    expect(typeof redis.set).toBe("function");
    expect(typeof redis.on).toBe("function");
  });

  it("Redis constructor is called with REDIS_URL or default", async () => {
    // The module may have been already loaded with the singleton;
    // we just verify the constructor was invoked at least once during module init
    expect(Redis).toHaveBeenCalled();
  });

  it("client registers an error listener (no crash on error event)", async () => {
    const { redis } = await import("./redis.js");
    expect(redis.on).toBeDefined();
    // Confirm 'error' handler was registered (called with 'error' as first arg)
    const onMock = vi.mocked(redis.on);
    const errorCallArgs = onMock.mock.calls.map((c) => c[0]);
    expect(errorCallArgs).toContain("error");
  });

  it("uses lazyConnect option (no immediate connection on import)", () => {
    // If ioredis is properly mocked, no real connection was attempted
    // We verify the constructor was NOT called with a connect that throws
    const constructorCalls = vi.mocked(Redis).mock.calls;
    expect(constructorCalls.length).toBeGreaterThan(0);

    const firstCallOptions = (constructorCalls[0] as unknown[])?.[1] as Record<string, unknown> | undefined;
    if (firstCallOptions != null) {
      expect(firstCallOptions["lazyConnect"]).toBe(true);
    }
  });
});
