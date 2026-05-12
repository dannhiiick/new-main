import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock redis (in-memory counter — no real Redis needed in tests) ───────────

const { _redisCounters } = vi.hoisted(() => ({
  _redisCounters: new Map<string, number>(),
}));

vi.mock("../../utils/redis.js", () => ({
  redis: {
    incr: vi.fn((key: string) => {
      const n = (_redisCounters.get(key) ?? 0) + 1;
      _redisCounters.set(key, n);
      return Promise.resolve(n);
    }),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

// ─── Mock prisma before importing the service ────────────────────────────────

vi.mock("../../db/client.js", () => ({
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

import { prisma } from "../../db/client.js";
import {
  requestOtp,
  verifyOtp,
  refreshTokens,
  OtpRateLimitError,
  InvalidOtpError,
  InvalidRefreshTokenError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  type SignFn,
  type VerifyFn,
} from "./auth.service.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockSign: SignFn = (_data, _opts) => "mock-token";
const mockSignRefresh: SignFn = (_data, _opts) => "mock-refresh-token";
const mockVerify: VerifyFn = async (token) => ({
  userId: "user-1",
  role: "LISTENER",
  type: token === "bad-type" ? "access" : "refresh",
});

function makeOtpRecord(overrides: Partial<{
  id: string;
  phone: string;
  code: string;
  expiresAt: Date;
  usedAt: Date | null;
  attempts: number;
}> = {}) {
  return {
    id: "challenge-1",
    phone: "+77001234567",
    code: "1234",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    usedAt: null,
    attempts: 0,
    ...overrides,
  };
}

function makeUser(overrides: Partial<{
  id: string;
  phone: string | null;
  email: string | null;
  displayName: string;
  role: string;
  preferredLocale: string;
}> = {}) {
  return {
    id: "user-1",
    phone: "+77001234567",
    email: null,
    displayName: "Test User",
    role: "LISTENER",
    preferredLocale: "ru",
    ...overrides,
  };
}

// ─── OTP rate limiter ─────────────────────────────────────────────────────────

describe("OTP rate limiting (checkAndIncrementOtpRate)", () => {
  // The rate limiter is module-level state — we need to use unique phone numbers
  // per test to avoid cross-contamination.

  beforeEach(() => {
    // Reset prisma mocks
    vi.mocked(prisma.otpCode.create).mockResolvedValue(makeOtpRecord() as never);
  });

  it("allows up to 3 OTP requests for the same phone in the window", async () => {
    const phone = `+7700${Math.random().toString().slice(2, 9)}`;
    vi.mocked(prisma.otpCode.create).mockResolvedValue(makeOtpRecord({ phone }) as never);

    await expect(requestOtp(phone)).resolves.toMatchObject({ challengeId: expect.any(String) });
    await expect(requestOtp(phone)).resolves.toMatchObject({ challengeId: expect.any(String) });
    await expect(requestOtp(phone)).resolves.toMatchObject({ challengeId: expect.any(String) });
  });

  it("throws OtpRateLimitError on the 4th request within the window", async () => {
    const phone = `+7799${Math.random().toString().slice(2, 9)}`;
    vi.mocked(prisma.otpCode.create).mockResolvedValue(makeOtpRecord({ phone }) as never);

    await requestOtp(phone);
    await requestOtp(phone);
    await requestOtp(phone);

    await expect(requestOtp(phone)).rejects.toThrow(OtpRateLimitError);
  });

  it("OtpRateLimitError has the correct name and message", () => {
    const err = new OtpRateLimitError();
    expect(err.name).toBe("OtpRateLimitError");
    expect(err.message).toContain("5 minutes");
  });
});

// ─── generateOtpCode (dev vs prod) ───────────────────────────────────────────

describe("generateOtpCode behavior", () => {
  it("returns '1234' in non-production env (NODE_ENV=test)", async () => {
    const phone = `+7788${Math.random().toString().slice(2, 9)}`;

    let capturedCode: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.otpCode.create).mockImplementation((async (args: any) => {
      capturedCode = args.data.code as string;
      return makeOtpRecord({ phone, code: capturedCode });
    }) as any);

    await requestOtp(phone);
    expect(capturedCode).toBe("1234");
  });

  it("returns a 6-digit string in production env", async () => {
    const origEnv = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";

    const phone = `+7766${Math.random().toString().slice(2, 9)}`;
    let capturedCode: string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.otpCode.create).mockImplementation((async (args: any) => {
      capturedCode = args.data.code as string;
      return makeOtpRecord({ phone, code: capturedCode });
    }) as any);

    await requestOtp(phone);
    process.env["NODE_ENV"] = origEnv;

    expect(capturedCode).toMatch(/^\d{6}$/);
  });
});

// ─── verifyOtp ────────────────────────────────────────────────────────────────

describe("verifyOtp", () => {
  beforeEach(() => {
    vi.mocked(prisma.otpCode.update).mockResolvedValue({} as never);
    vi.mocked(prisma.userDevice.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
  });

  it("returns auth tokens when OTP is valid", async () => {
    const otpRecord = makeOtpRecord();
    const user = makeUser();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(otpRecord as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

    const result = await verifyOtp(
      { challengeId: "challenge-1", code: "1234", deviceId: undefined },
      mockSign,
      mockSignRefresh,
    );

    expect(result.accessToken).toBe("mock-token");
    expect(result.refreshToken).toBe("mock-refresh-token");
    expect(result.user.id).toBe("user-1");
  });

  it("creates a new user if phone not registered", async () => {
    const otpRecord = makeOtpRecord();
    const newUser = makeUser();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(otpRecord as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue(newUser as never);

    const result = await verifyOtp(
      { challengeId: "challenge-1", code: "1234", deviceId: undefined },
      mockSign,
      mockSignRefresh,
    );

    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(result.user.id).toBe("user-1");
  });

  it("throws InvalidOtpError when OTP record is not found", async () => {
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(null as never);

    await expect(
      verifyOtp(
        { challengeId: "bad-id", code: "0000", deviceId: undefined },
        mockSign,
        mockSignRefresh,
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("throws InvalidOtpError when OTP is already used", async () => {
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(
      makeOtpRecord({ usedAt: new Date() }) as never,
    );

    await expect(
      verifyOtp(
        { challengeId: "challenge-1", code: "1234", deviceId: undefined },
        mockSign,
        mockSignRefresh,
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("throws InvalidOtpError when OTP is expired", async () => {
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(
      makeOtpRecord({ expiresAt: new Date(Date.now() - 1000) }) as never,
    );

    await expect(
      verifyOtp(
        { challengeId: "challenge-1", code: "1234", deviceId: undefined },
        mockSign,
        mockSignRefresh,
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("throws InvalidOtpError when code does not match", async () => {
    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(
      makeOtpRecord({ code: "9999" }) as never,
    );
    vi.mocked(prisma.otpCode.update).mockResolvedValue({} as never);

    await expect(
      verifyOtp(
        { challengeId: "challenge-1", code: "1234", deviceId: undefined },
        mockSign,
        mockSignRefresh,
      ),
    ).rejects.toThrow(InvalidOtpError);
  });

  it("upserts device when deviceId is provided", async () => {
    const otpRecord = makeOtpRecord();
    const user = makeUser();

    vi.mocked(prisma.otpCode.findUnique).mockResolvedValue(otpRecord as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

    await verifyOtp(
      { challengeId: "challenge-1", code: "1234", deviceId: "device-abc" },
      mockSign,
      mockSignRefresh,
    );

    expect(prisma.userDevice.upsert).toHaveBeenCalledOnce();
  });
});

// ─── refreshTokens ────────────────────────────────────────────────────────────

describe("refreshTokens", () => {
  beforeEach(() => {
    vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as never);
    vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
  });

  it("returns new tokens when refresh token is valid", async () => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      userId: "user-1",
      token: "mock-refresh-token",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deviceId: null,
    } as never);

    const result = await refreshTokens(
      "mock-refresh-token",
      mockSign,
      mockSignRefresh,
      mockVerify,
    );

    expect(result.accessToken).toBe("mock-token");
    expect(result.newRefreshToken).toBe("mock-refresh-token");
    expect(prisma.refreshToken.update).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it("throws InvalidRefreshTokenError when token type is not 'refresh'", async () => {
    const badVerify: VerifyFn = async (_token) => ({
      userId: "user-1",
      role: "LISTENER",
      type: "access", // wrong type
    });

    await expect(
      refreshTokens("some-token", mockSign, mockSignRefresh, badVerify),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("throws InvalidRefreshTokenError when token is not in DB", async () => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(null as never);

    await expect(
      refreshTokens("unknown-token", mockSign, mockSignRefresh, mockVerify),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("throws InvalidRefreshTokenError when token is revoked", async () => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      userId: "user-1",
      token: "mock-refresh-token",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deviceId: null,
    } as never);

    await expect(
      refreshTokens("mock-refresh-token", mockSign, mockSignRefresh, mockVerify),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it("throws InvalidRefreshTokenError when token is expired", async () => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
      id: "rt-1",
      userId: "user-1",
      token: "mock-refresh-token",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired
      deviceId: null,
    } as never);

    await expect(
      refreshTokens("mock-refresh-token", mockSign, mockSignRefresh, mockVerify),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });
});

// ─── Error classes ────────────────────────────────────────────────────────────

describe("Auth error classes", () => {
  it("InvalidOtpError has correct name", () => {
    const e = new InvalidOtpError();
    expect(e.name).toBe("InvalidOtpError");
    expect(e).toBeInstanceOf(Error);
  });

  it("InvalidRefreshTokenError has correct name", () => {
    const e = new InvalidRefreshTokenError();
    expect(e.name).toBe("InvalidRefreshTokenError");
  });

  it("EmailAlreadyExistsError has correct name", () => {
    const e = new EmailAlreadyExistsError();
    expect(e.name).toBe("EmailAlreadyExistsError");
  });

  it("InvalidCredentialsError has correct name", () => {
    const e = new InvalidCredentialsError();
    expect(e.name).toBe("InvalidCredentialsError");
  });
});
