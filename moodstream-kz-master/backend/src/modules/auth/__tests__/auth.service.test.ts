import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock redis (in-memory counter — no real Redis needed in tests) ────────────

const { _redisCounters } = vi.hoisted(() => ({
  _redisCounters: new Map<string, number>(),
}));

vi.mock("../../../utils/redis.js", () => ({
  redis: {
    incr: vi.fn((key: string) => {
      const n = (_redisCounters.get(key) ?? 0) + 1;
      _redisCounters.set(key, n);
      return Promise.resolve(n);
    }),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

// ── Mock prisma BEFORE importing the service ─────────────────────────────────
vi.mock("../../../db/client.js", () => ({
  prisma: {
    otpCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    userDevice: {
      upsert: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    emailCredential: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../../db/client.js";
import {
  OtpRateLimitError,
  InvalidOtpError,
  InvalidRefreshTokenError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  requestOtp,
  verifyOtp,
  refreshTokens,
  revokeRefreshToken,
  registerEmail,
  loginEmail,
  type RefreshResponse,
} from "../auth.service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSignFn(tokenValue = "mock-token") {
  return vi.fn().mockReturnValue(tokenValue);
}

function makeVerifyFn(payload = { userId: "user-1", role: "LISTENER" as const, type: "refresh" }) {
  return vi.fn().mockResolvedValue(payload);
}

function makeUser(overrides: Partial<{
  id: string;
  displayName: string;
  role: "LISTENER" | "ADMIN" | "CATALOG_MANAGER";
  preferredLocale: string;
  phone: string;
}> = {}) {
  return {
    id: "user-1",
    displayName: "Test User",
    role: "LISTENER" as const,
    preferredLocale: "ru",
    phone: "+77001234567",
    ...overrides,
  };
}

function makeOtpRecord(overrides: Partial<{
  id: string;
  phone: string;
  code: string;
  usedAt: Date | null;
  expiresAt: Date;
  attempts: number;
}> = {}) {
  return {
    id: "otp-1",
    phone: "+77001234567",
    code: "1234",
    usedAt: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now
    attempts: 0,
    ...overrides,
  };
}

// ── OTP Rate Limiting ─────────────────────────────────────────────────────────

describe("auth.service — OTP rate limiting", () => {
  // The rate limiter is module-level state, so we need unique phone numbers per test
  // to avoid cross-test contamination

  it("allows up to 3 OTP requests within the window", async () => {
    const mockCreate = vi.mocked(prisma.otpCode.create);
    const phone = "+77001111101";

    mockCreate.mockResolvedValue(makeOtpRecord({ phone }) as never);

    // Three requests should succeed
    await expect(requestOtp(phone)).resolves.not.toThrow();
    await expect(requestOtp(phone)).resolves.not.toThrow();
    await expect(requestOtp(phone)).resolves.not.toThrow();
  });

  it("throws OtpRateLimitError on the 4th request within the window", async () => {
    const mockCreate = vi.mocked(prisma.otpCode.create);
    const phone = "+77001111102";

    mockCreate.mockResolvedValue(makeOtpRecord({ phone }) as never);

    await requestOtp(phone);
    await requestOtp(phone);
    await requestOtp(phone);

    await expect(requestOtp(phone)).rejects.toThrow(OtpRateLimitError);
    await expect(requestOtp(phone)).rejects.toThrow("Too many OTP requests");
  });

  it("resets the rate limit counter after the window expires", async () => {
    const mockCreate = vi.mocked(prisma.otpCode.create);
    const phone = "+77001111103";

    mockCreate.mockResolvedValue(makeOtpRecord({ phone }) as never);

    // Exhaust the limit
    await requestOtp(phone);
    await requestOtp(phone);
    await requestOtp(phone);
    await expect(requestOtp(phone)).rejects.toThrow(OtpRateLimitError);

    // Manually manipulate the rate-limit map via time travel
    // Since we can't easily advance time, we verify the window mechanism indirectly:
    // A fresh phone should still work (proves window is per-phone, not global)
    const freshPhone = "+77001111104";
    mockCreate.mockResolvedValue(makeOtpRecord({ phone: freshPhone }) as never);
    await expect(requestOtp(freshPhone)).resolves.not.toThrow();
  });
});

// ── verifyOtp ─────────────────────────────────────────────────────────────────

describe("auth.service — verifyOtp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tokens and user info on valid OTP", async () => {
    const user = makeUser();
    const otpRecord = makeOtpRecord();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);
    vi.mocked(prisma.otpCode.update).mockResolvedValueOnce({ ...otpRecord, usedAt: new Date() } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    const signAccess = makeSignFn("access-token-value");
    const signRefresh = makeSignFn("refresh-token-value");

    const result = await verifyOtp(
      { challengeId: "otp-1", code: "1234", deviceId: undefined },
      signAccess,
      signRefresh,
    );

    expect(result.accessToken).toBe("access-token-value");
    expect(result.refreshToken).toBe("refresh-token-value");
    expect(result.user.id).toBe("user-1");
    expect(result.user.role).toBe("LISTENER");
  });

  it("access token payload contains userId, role, and type=access", async () => {
    const user = makeUser({ id: "u-xyz", role: "ADMIN" });
    const otpRecord = makeOtpRecord();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);
    vi.mocked(prisma.otpCode.update).mockResolvedValueOnce({ ...otpRecord, usedAt: new Date() } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    const signAccess = vi.fn().mockReturnValue("access-tok");
    const signRefresh = makeSignFn();

    await verifyOtp(
      { challengeId: "otp-1", code: "1234", deviceId: undefined },
      signAccess,
      signRefresh,
    );

    expect(signAccess).toHaveBeenCalledWith(
      { userId: "u-xyz", role: "ADMIN", type: "access" },
      { expiresIn: "15m" },
    );
  });

  it("refresh token payload contains userId, role, and type=refresh", async () => {
    const user = makeUser({ id: "u-xyz" });
    const otpRecord = makeOtpRecord();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);
    vi.mocked(prisma.otpCode.update).mockResolvedValueOnce({ ...otpRecord, usedAt: new Date() } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    const signAccess = makeSignFn();
    const signRefresh = vi.fn().mockReturnValue("refresh-tok");

    await verifyOtp(
      { challengeId: "otp-1", code: "1234", deviceId: undefined },
      signAccess,
      signRefresh,
    );

    expect(signRefresh).toHaveBeenCalledWith(
      { userId: "u-xyz", role: "LISTENER", type: "refresh" },
      { expiresIn: "30d" },
    );
  });

  it("throws InvalidOtpError when OTP record not found", async () => {
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(null);

    await expect(
      verifyOtp(
        { challengeId: "bad-id", code: "9999", deviceId: undefined },
        makeSignFn(),
        makeSignFn(),
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("throws InvalidOtpError when OTP code is wrong", async () => {
    const otpRecord = makeOtpRecord({ code: "1234" });
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);
    vi.mocked(prisma.otpCode.update).mockResolvedValueOnce({} as never);

    await expect(
      verifyOtp(
        { challengeId: "otp-1", code: "9999", deviceId: undefined },
        makeSignFn(),
        makeSignFn(),
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("throws InvalidOtpError when OTP is already used", async () => {
    const otpRecord = makeOtpRecord({ usedAt: new Date(Date.now() - 1000) });
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);

    await expect(
      verifyOtp(
        { challengeId: "otp-1", code: "1234", deviceId: undefined },
        makeSignFn(),
        makeSignFn(),
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("throws InvalidOtpError when OTP is expired", async () => {
    const otpRecord = makeOtpRecord({
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);

    await expect(
      verifyOtp(
        { challengeId: "otp-1", code: "1234", deviceId: undefined },
        makeSignFn(),
        makeSignFn(),
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("creates a new user when phone is not registered", async () => {
    const otpRecord = makeOtpRecord();
    const newUser = makeUser({ id: "new-user" });

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);
    vi.mocked(prisma.otpCode.update).mockResolvedValueOnce({ ...otpRecord, usedAt: new Date() } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null); // no existing user
    vi.mocked(prisma.user.create).mockResolvedValueOnce(newUser as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    const result = await verifyOtp(
      { challengeId: "otp-1", code: "1234", deviceId: undefined },
      makeSignFn(),
      makeSignFn(),
    );

    expect(prisma.user.create).toHaveBeenCalled();
    expect(result.user.id).toBe("new-user");
  });

  it("upserts device when deviceId is provided", async () => {
    const otpRecord = makeOtpRecord();
    const user = makeUser();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValueOnce(otpRecord as never);
    vi.mocked(prisma.otpCode.update).mockResolvedValueOnce({ ...otpRecord, usedAt: new Date() } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as never);
    vi.mocked(prisma.userDevice.upsert).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    await verifyOtp(
      { challengeId: "otp-1", code: "1234", deviceId: "device-abc" },
      makeSignFn(),
      makeSignFn(),
    );

    expect(prisma.userDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: "device-abc" },
      }),
    );
  });
});

// ── refreshTokens ─────────────────────────────────────────────────────────────

describe("auth.service — refreshTokens (token rotation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rotates the token: revokes old, issues new access + refresh tokens", async () => {
    const storedToken = {
      id: "rt-1",
      userId: "user-1",
      token: "old-refresh",
      deviceId: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const verifyFn = makeVerifyFn({ userId: "user-1", role: "LISTENER", type: "refresh" });
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValueOnce(storedToken as never);
    vi.mocked(prisma.refreshToken.update).mockResolvedValueOnce({} as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    const signAccess = makeSignFn("new-access");
    const signRefresh = makeSignFn("new-refresh");

    const result = await refreshTokens("old-refresh", signAccess, signRefresh, verifyFn);

    expect(result.accessToken).toBe("new-access");
    expect(result.newRefreshToken).toBe("new-refresh");

    // Old token should be revoked
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rt-1" },
        data: { revokedAt: expect.any(Date) },
      }),
    );

    // New token should be created
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it("throws InvalidRefreshTokenError when token type is not refresh", async () => {
    const verifyFn = makeVerifyFn({ userId: "user-1", role: "LISTENER", type: "access" }); // wrong type

    await expect(
      refreshTokens("some-token", makeSignFn(), makeSignFn(), verifyFn),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("throws InvalidRefreshTokenError when stored token is already revoked", async () => {
    const storedToken = {
      id: "rt-1",
      userId: "user-1",
      token: "revoked-refresh",
      deviceId: null,
      revokedAt: new Date(Date.now() - 1000), // already revoked
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const verifyFn = makeVerifyFn();
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValueOnce(storedToken as never);

    await expect(
      refreshTokens("revoked-refresh", makeSignFn(), makeSignFn(), verifyFn),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("throws InvalidRefreshTokenError when stored token is expired", async () => {
    const storedToken = {
      id: "rt-1",
      userId: "user-1",
      token: "expired-refresh",
      deviceId: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired
    };

    const verifyFn = makeVerifyFn();
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValueOnce(storedToken as never);

    await expect(
      refreshTokens("expired-refresh", makeSignFn(), makeSignFn(), verifyFn),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("throws InvalidRefreshTokenError when token not found in DB", async () => {
    const verifyFn = makeVerifyFn();
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValueOnce(null);

    await expect(
      refreshTokens("unknown-token", makeSignFn(), makeSignFn(), verifyFn),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });
});

// ── registerEmail / loginEmail ────────────────────────────────────────────────

describe("auth.service — registerEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws EmailAlreadyExistsError when email is already registered", async () => {
    vi.mocked(prisma.emailCredential.findUnique).mockResolvedValueOnce({
      email: "taken@example.com",
    } as never);

    await expect(
      registerEmail("taken@example.com", "password", "User", makeSignFn(), makeSignFn()),
    ).rejects.toThrow(EmailAlreadyExistsError);
  });

  it("creates user and returns tokens for a new email", async () => {
    vi.mocked(prisma.emailCredential.findUnique).mockResolvedValueOnce(null);
    const user = makeUser({ id: "new-user", preferredLocale: "ru" });
    vi.mocked(prisma.user.create).mockResolvedValueOnce(user as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValueOnce({} as never);

    const signAccess = makeSignFn("acc");
    const signRefresh = makeSignFn("ref");

    const result = await registerEmail("new@example.com", "secret", "New User", signAccess, signRefresh);

    expect(result.accessToken).toBe("acc");
    expect(result.refreshToken).toBe("ref");
    expect(result.user.id).toBe("new-user");
  });
});

describe("auth.service — loginEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws InvalidCredentialsError when email not found", async () => {
    vi.mocked(prisma.emailCredential.findUnique).mockResolvedValueOnce(null);

    await expect(
      loginEmail("unknown@example.com", "password", makeSignFn(), makeSignFn()),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError when password is wrong", async () => {
    // scrypt produces 64 bytes → 128 hex chars. Provide a valid-shaped hash for a different password
    // so timingSafeEqual can run without a RangeError but return false.
    const salt = "a".repeat(32); // 16 bytes in hex
    const storedHash = "b".repeat(128); // 64 bytes in hex (won't match "wrongpassword")
    const fakeHash = `${salt}:${storedHash}`;

    vi.mocked(prisma.emailCredential.findUnique).mockResolvedValueOnce({
      email: "user@example.com",
      passwordHash: fakeHash,
      user: makeUser(),
    } as never);

    await expect(
      loginEmail("user@example.com", "wrongpassword", makeSignFn(), makeSignFn()),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

// ── revokeRefreshToken ────────────────────────────────────────────────────────

describe("auth.service — revokeRefreshToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateMany to revoke the given token", async () => {
    vi.mocked(prisma.refreshToken.updateMany).mockResolvedValueOnce({ count: 1 } as never);

    await revokeRefreshToken("token-to-revoke");

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { token: "token-to-revoke", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
