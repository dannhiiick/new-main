import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { prisma } from "../../db/client.js";
import { redis } from "../../utils/redis.js";
import type { UserRole } from "../../domain/types.js";
import { sendPasswordResetEmail } from "../../utils/mailer.js";

const scryptAsync = promisify<
  string | Buffer,
  string | Buffer,
  number,
  Buffer
>(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const hash = await scryptAsync(password, salt, 64);
  const storedHashBuf = Buffer.from(storedHash, "hex");
  return timingSafeEqual(hash, storedHashBuf);
}

// Redis-backed OTP rate limiter — survives restarts and works across instances
const OTP_WINDOW_SEC = 5 * 60; // 5 minutes
const OTP_MAX_ATTEMPTS = 3;

export class OtpRateLimitError extends Error {
  constructor() {
    super("Too many OTP requests. Please try again in 5 minutes.");
    this.name = "OtpRateLimitError";
  }
}

export class InvalidOtpError extends Error {
  constructor() {
    super("Invalid or expired OTP code");
    this.name = "InvalidOtpError";
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Invalid or expired refresh token");
    this.name = "InvalidRefreshTokenError";
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "EmailAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidResetTokenError extends Error {
  constructor() {
    super("Invalid or expired reset token");
    this.name = "InvalidResetTokenError";
  }
}

async function checkAndIncrementOtpRate(phone: string): Promise<void> {
  const key = `otp:rate:${phone}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // First request in window — set TTL
    await redis.expire(key, OTP_WINDOW_SEC);
  }
  if (count > OTP_MAX_ATTEMPTS) {
    throw new OtpRateLimitError();
  }
}

function generateOtpCode(): string {
  if (process.env["NODE_ENV"] !== "production") {
    return "1234";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface OtpRequestResult {
  challengeId: string;
  expiresAt: string;
}

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await checkAndIncrementOtpRate(phone);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const otpRecord = await prisma.otpCode.create({
    data: { phone, code, expiresAt },
  });

  // In production we'd call an SMS gateway here
  if (process.env["NODE_ENV"] !== "production") {
    console.log(`[DEV] OTP for ${phone}: ${code}`);
  }

  return {
    challengeId: otpRecord.id,
    expiresAt: expiresAt.toISOString(),
  };
}

export interface VerifyOtpPayload {
  challengeId: string;
  code: string;
  deviceId: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    displayName: string;
    role: UserRole;
    preferredLocale: string;
  };
}

/** Shape returned to the HTTP layer — refreshToken is set as a cookie, not in body */
export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    displayName: string;
    role: UserRole;
    preferredLocale: string;
  };
}

/** Shape returned when refreshing — new tokens without user info */
export interface RefreshResponse {
  accessToken: string;
  newRefreshToken: string;
}

export type SignFn = (data: object, opts: { expiresIn: string }) => string;
export type VerifyFn = (token: string) => Promise<{
  userId: string;
  role: UserRole;
  type: string;
}>;

export async function verifyOtp(
  payload: VerifyOtpPayload,
  signAccessToken: SignFn,
  signRefreshToken: SignFn,
): Promise<AuthTokens> {
  const { challengeId, code, deviceId } = payload;

  const otpRecord = await prisma.otpCode.findUnique({
    where: { id: challengeId },
  });

  if (
    otpRecord == null ||
    otpRecord.usedAt != null ||
    otpRecord.expiresAt < new Date() ||
    otpRecord.code !== code
  ) {
    if (otpRecord != null && otpRecord.usedAt == null) {
      await prisma.otpCode.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });
    }
    throw new InvalidOtpError();
  }

  // Mark OTP as used
  await prisma.otpCode.update({
    where: { id: challengeId },
    data: { usedAt: new Date() },
  });

  // Find or create user by phone
  let user = await prisma.user.findUnique({
    where: { phone: otpRecord.phone },
  });

  if (user == null) {
    user = await prisma.user.create({
      data: {
        phone: otpRecord.phone,
        displayName: otpRecord.phone,
        role: "LISTENER",
        authAccounts: {
          create: {
            provider: "PHONE_OTP",
            providerId: otpRecord.phone,
          },
        },
      },
    });
  }

  // Register device if provided
  if (deviceId != null) {
    await prisma.userDevice.upsert({
      where: { deviceId },
      create: {
        userId: user.id,
        deviceId,
        platform: "unknown",
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
    });
  }

  const accessToken = signAccessToken(
    { userId: user.id, role: user.role, type: "access" },
    { expiresIn: "15m" },
  );

  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const refreshTokenValue = signRefreshToken(
    { userId: user.id, role: user.role, type: "refresh" },
    { expiresIn: "30d" },
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      deviceId: deviceId ?? null,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      preferredLocale: user.preferredLocale,
    },
  };
}

export async function refreshTokens(
  rawRefreshToken: string,
  signAccessToken: SignFn,
  signRefreshToken: SignFn,
  verifyRefreshToken: VerifyFn,
): Promise<RefreshResponse> {
  const decoded = await verifyRefreshToken(rawRefreshToken);

  if (decoded.type !== "refresh") {
    throw new InvalidRefreshTokenError();
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: rawRefreshToken },
  });

  if (
    storedToken == null ||
    storedToken.revokedAt != null ||
    storedToken.expiresAt < new Date()
  ) {
    throw new InvalidRefreshTokenError();
  }

  // Revoke old token (token rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const newAccessToken = signAccessToken(
    { userId: decoded.userId, role: decoded.role, type: "access" },
    { expiresIn: "15m" },
  );

  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const newRefreshToken = signRefreshToken(
    { userId: decoded.userId, role: decoded.role, type: "refresh" },
    { expiresIn: "30d" },
  );

  await prisma.refreshToken.create({
    data: {
      userId: storedToken.userId,
      token: newRefreshToken,
      deviceId: storedToken.deviceId,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    newRefreshToken,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: rawToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function issueTokens(
  user: { id: string; displayName: string; role: UserRole; preferredLocale: string },
  signAccessToken: SignFn,
  signRefreshToken: SignFn,
  deviceId?: string,
): Promise<AuthTokens> {
  const accessToken = signAccessToken(
    { userId: user.id, role: user.role, type: "access" },
    { expiresIn: "15m" },
  );

  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const refreshTokenValue = signRefreshToken(
    { userId: user.id, role: user.role, type: "refresh" },
    { expiresIn: "30d" },
  );

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      deviceId: deviceId ?? null,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenValue,
    user: {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      preferredLocale: user.preferredLocale,
    },
  };
}

export async function registerEmail(
  email: string,
  password: string,
  displayName: string,
  signAccessToken: SignFn,
  signRefreshToken: SignFn,
): Promise<AuthTokens> {
  const existing = await prisma.emailCredential.findUnique({ where: { email } });
  if (existing != null) throw new EmailAlreadyExistsError();

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      role: "LISTENER",
      authAccounts: {
        create: { provider: "EMAIL_MAGIC_LINK", providerId: email },
      },
      emailCredential: {
        create: { email, passwordHash },
      },
    },
  });

  return issueTokens(user, signAccessToken, signRefreshToken);
}

export async function loginEmail(
  email: string,
  password: string,
  signAccessToken: SignFn,
  signRefreshToken: SignFn,
): Promise<AuthTokens> {
  const credential = await prisma.emailCredential.findUnique({
    where: { email },
    include: { user: true },
  });

  if (credential == null) throw new InvalidCredentialsError();

  const valid = await verifyPassword(password, credential.passwordHash);
  if (!valid) throw new InvalidCredentialsError();

  return issueTokens(credential.user, signAccessToken, signRefreshToken);
}

export interface ForgotPasswordResult {
  /** In dev mode only — token to use in /email/reset */
  devToken?: string;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const credential = await prisma.emailCredential.findUnique({ where: { email } });

  // Always return success to avoid email enumeration
  if (credential == null) return {};

  const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const token = Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.emailCredential.update({
    where: { email },
    data: { resetToken: token, resetExpiresAt: expiresAt },
  });

  if (process.env["NODE_ENV"] !== "production") {
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
    return { devToken: token };
  }

  await sendPasswordResetEmail(email, token);
  return {};
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const credential = await prisma.emailCredential.findUnique({
    where: { resetToken: token },
  });

  if (
    credential == null ||
    credential.resetExpiresAt == null ||
    credential.resetExpiresAt < new Date()
  ) {
    throw new InvalidResetTokenError();
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.emailCredential.update({
    where: { resetToken: token },
    data: { passwordHash, resetToken: null, resetExpiresAt: null },
  });
}
