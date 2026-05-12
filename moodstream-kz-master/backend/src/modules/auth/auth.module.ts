import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { JWT } from "@fastify/jwt";
import { z } from "zod";
import type { UserRole } from "../../domain/types.js";
import type { ProblemDetails } from "../../domain/types.js";
import type { SignFn, VerifyFn } from "./auth.service.js";
import { verifyJwt, getUserId } from "../../plugins/authenticate.js";
import {
  requestOtp,
  verifyOtp,
  refreshTokens,
  revokeRefreshToken,
  registerEmail,
  loginEmail,
  forgotPassword,
  resetPassword,
  OtpRateLimitError,
  InvalidOtpError,
  InvalidRefreshTokenError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidResetTokenError,
} from "./auth.service.js";

// Cookie name and options
const REFRESH_COOKIE = "refreshToken";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

const OtpRequestSchema = z.object({
  phone: z.string().min(7).max(20),
});

const OtpVerifySchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().length(4),
  deviceId: z.string().optional(),
});

export const authModule: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // Access the jwtRefresh namespace via the runtime jwt object
  const jwtRefreshNs = (app.jwt as unknown as Record<string, JWT>)['jwtRefresh']!;

  const signAccess: SignFn = (data, opts) =>
    app.jwt.sign(data, { expiresIn: opts.expiresIn });

  const signRefresh: SignFn = (data, opts) =>
    jwtRefreshNs.sign(data, { expiresIn: opts.expiresIn });

  const verifyRefresh: VerifyFn = async (token) =>
    jwtRefreshNs.verify<{
      userId: string;
      role: UserRole;
      type: string;
    }>(token);

  // Auth route rate limit: 10 req/min per IP
  const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  // POST /otp/request
  app.post("/otp/request", authRateLimit, async (request, reply) => {
    const body = OtpRequestSchema.parse(request.body);
    try {
      const result = await requestOtp(body.phone);
      return reply.status(200).send(result);
    } catch (err) {
      if (err instanceof OtpRateLimitError) {
        const problem: ProblemDetails = {
          code: "RATE_LIMITED",
          message: err.message,
        };
        return reply.status(429).send(problem);
      }
      throw err;
    }
  });

  // POST /otp/verify
  app.post("/otp/verify", authRateLimit, async (request, reply) => {
    const raw = OtpVerifySchema.parse(request.body);
    const payload = {
      challengeId: raw.challengeId,
      code: raw.code,
      deviceId: raw.deviceId,
    };

    try {
      const result = await verifyOtp(payload, signAccess, signRefresh);
      // Set refresh token as httpOnly cookie
      void reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh",
        maxAge: COOKIE_MAX_AGE,
      });
      return reply.status(200).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof InvalidOtpError) {
        const problem: ProblemDetails = {
          code: "INVALID_OTP",
          message: err.message,
        };
        return reply.status(400).send(problem);
      }
      throw err;
    }
  });

  // POST /refresh — reads refreshToken from httpOnly cookie or request body (mobile)
  app.post("/refresh", async (request, reply) => {
    const cookieToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    const bodyToken = (request.body as Record<string, unknown> | null)?.["refreshToken"];
    const rawToken = cookieToken ?? (typeof bodyToken === "string" ? bodyToken : undefined);

    if (rawToken == null || rawToken.length === 0) {
      const problem: ProblemDetails = {
        code: "INVALID_REFRESH_TOKEN",
        message: "No refresh token present",
      };
      return reply.status(401).send(problem);
    }

    try {
      const result = await refreshTokens(
        rawToken,
        signAccess,
        signRefresh,
        verifyRefresh,
      );
      // Rotate cookie
      void reply.setCookie(REFRESH_COOKIE, result.newRefreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh",
        maxAge: COOKIE_MAX_AGE,
      });
      return reply.status(200).send({
        accessToken: result.accessToken,
        refreshToken: result.newRefreshToken,
      });
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) {
        const problem: ProblemDetails = {
          code: "INVALID_REFRESH_TOKEN",
          message: err.message,
        };
        return reply.status(401).send(problem);
      }
      throw err;
    }
  });

  // POST /logout — clears cookie and revokes token
  app.post("/logout", async (request, reply) => {
    const cookieToken = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];

    if (cookieToken != null && cookieToken.length > 0) {
      await revokeRefreshToken(cookieToken);
    }

    // Clear the cookie
    void reply.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/api/v1/auth/refresh",
    });

    return reply.status(204).send();
  });

  // PATCH /profile — update displayName (authenticated)
  const UpdateProfileSchema = z.object({
    displayName: z.string().min(1).max(80).trim(),
  });

  app.patch("/profile", { preHandler: [verifyJwt] }, async (request, reply) => {
    const userId = getUserId(request);
    const body = UpdateProfileSchema.parse(request.body);
    const { prisma } = await import("../../db/client.js");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { displayName: body.displayName },
      select: { id: true, displayName: true, role: true, preferredLocale: true },
    });
    return reply.send({ user: updated });
  });

  // POST /email/register — also rate limited
  const EmailRegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(80).trim(),
  });

  app.post("/email/register", authRateLimit, async (request, reply) => {
    const body = EmailRegisterSchema.parse(request.body);
    try {
      const result = await registerEmail(
        body.email.toLowerCase().trim(),
        body.password,
        body.displayName,
        signAccess,
        signRefresh,
      );
      // Set refresh token as httpOnly cookie
      void reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh",
        maxAge: COOKIE_MAX_AGE,
      });
      return reply.status(201).send({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        const problem: ProblemDetails = { code: "EMAIL_EXISTS", message: err.message };
        return reply.status(409).send(problem);
      }
      throw err;
    }
  });

  // POST /email/login
  const EmailLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post("/email/login", authRateLimit, async (request, reply) => {
    const body = EmailLoginSchema.parse(request.body);
    try {
      const result = await loginEmail(body.email.toLowerCase().trim(), body.password, signAccess, signRefresh);
      // Set refresh token as httpOnly cookie
      void reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh",
        maxAge: COOKIE_MAX_AGE,
      });
      return reply.status(200).send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        const problem: ProblemDetails = { code: "INVALID_CREDENTIALS", message: err.message };
        return reply.status(401).send(problem);
      }
      throw err;
    }
  });

  // POST /email/forgot
  const ForgotSchema = z.object({ email: z.string().email() });

  app.post("/email/forgot", authRateLimit, async (request, reply) => {
    const body = ForgotSchema.parse(request.body);
    const result = await forgotPassword(body.email);
    return reply.status(200).send(result);
  });

  // GET /reset-password — HTML form for email reset links
  app.get("/reset-password", async (request, reply) => {
    const { token } = request.query as { token?: string };
    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoodStream — Сброс пароля</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f0f13; color: #f5f5f7; font-family: -apple-system, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #1c1c24; border: 1px solid #2a2a35; border-radius: 16px;
            padding: 32px; width: 100%; max-width: 400px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
    label { display: block; font-size: 13px; color: #aaa; margin-bottom: 6px; }
    input { width: 100%; background: #0f0f13; border: 1px solid #2a2a35; border-radius: 10px;
            padding: 12px 14px; color: #f5f5f7; font-size: 15px; margin-bottom: 16px; }
    input:focus { outline: none; border-color: #c87b4e; }
    button { width: 100%; background: #c87b4e; color: #fff; border: none; border-radius: 10px;
             padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; }
    button:hover { background: #b5693d; }
    .msg { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 14px; text-align: center; display: none; }
    .msg.ok { background: #1a3a2a; color: #4ade80; display: block; }
    .msg.err { background: #3a1a1a; color: #f87171; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Новый пароль</h1>
    <p class="sub">MoodStream — введите новый пароль для вашего аккаунта</p>
    <form id="form">
      <label>Новый пароль</label>
      <input type="password" id="pw" placeholder="Минимум 8 символов" minlength="8" required>
      <label>Повторите пароль</label>
      <input type="password" id="pw2" placeholder="Повторите пароль" required>
      <button type="submit">Сохранить пароль</button>
    </form>
    <div id="msg" class="msg"></div>
  </div>
  <script>
    const token = ${JSON.stringify(token ?? "")};
    document.getElementById("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = document.getElementById("pw").value;
      const pw2 = document.getElementById("pw2").value;
      const msg = document.getElementById("msg");
      if (pw !== pw2) { msg.className = "msg err"; msg.textContent = "Пароли не совпадают"; return; }
      if (!token) { msg.className = "msg err"; msg.textContent = "Токен отсутствует"; return; }
      try {
        const res = await fetch("/api/v1/auth/email/reset", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: pw })
        });
        if (res.ok) {
          msg.className = "msg ok"; msg.textContent = "Пароль изменён! Войдите в приложение.";
          document.getElementById("form").style.display = "none";
        } else {
          const d = await res.json();
          msg.className = "msg err"; msg.textContent = d.message ?? "Ошибка. Попробуйте снова.";
        }
      } catch { msg.className = "msg err"; msg.textContent = "Ошибка сети"; }
    });
  </script>
</body>
</html>`;
    return reply.type("text/html").send(html);
  });

  // POST /email/reset
  const ResetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128),
  });

  app.post("/email/reset", async (request, reply) => {
    const body = ResetSchema.parse(request.body);
    try {
      await resetPassword(body.token, body.password);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof InvalidResetTokenError) {
        const problem: ProblemDetails = { code: "INVALID_RESET_TOKEN", message: err.message };
        return reply.status(400).send(problem);
      }
      throw err;
    }
  });

  // POST /bootstrap-admin
  // One-time endpoint — creates the first ADMIN user if none exists.
  // Self-disabling: returns 409 once any ADMIN account exists.
  const BootstrapSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(80).trim(),
    secret: z.string().min(1),
  });

  app.post("/bootstrap-admin", async (request, reply) => {
    const body = BootstrapSchema.parse(request.body);

    // Verify bootstrap secret to prevent abuse
    const expectedSecret = process.env["BOOTSTRAP_SECRET"];
    if (!expectedSecret || body.secret !== expectedSecret) {
      const problem: ProblemDetails = { code: "FORBIDDEN", message: "Invalid bootstrap secret." };
      return reply.status(403).send(problem);
    }

    // Only allowed if no ADMIN exists yet
    const { prisma } = await import("../../db/client.js");
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount > 0) {
      const problem: ProblemDetails = { code: "ALREADY_BOOTSTRAPPED", message: "An admin account already exists." };
      return reply.status(409).send(problem);
    }

    try {
      const result = await registerEmail(
        body.email.toLowerCase().trim(),
        body.password,
        body.displayName,
        signAccess,
        signRefresh,
      );
      // Upgrade to ADMIN
      await prisma.user.update({
        where: { id: result.user.id },
        data: { role: "ADMIN" },
      });
      return reply.status(201).send({ message: "Admin created.", email: body.email });
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        // User exists but may not be ADMIN — upgrade role
        const { prisma: db } = await import("../../db/client.js");
        const cred = await db.emailCredential.findUnique({
          where: { email: body.email.toLowerCase().trim() },
          select: { userId: true },
        });
        if (cred) {
          await db.user.update({ where: { id: cred.userId }, data: { role: "ADMIN" } });
          return reply.status(200).send({ message: "Existing user promoted to ADMIN.", email: body.email });
        }
      }
      throw err;
    }
  });
};
