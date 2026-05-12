---
tags: [report, security, hardening, audit]
date: 2026-04-07
type: security-report
---

# Security Hardening Report

## Threat Model Summary

MoodStream KZ is a consumer music streaming API serving authenticated mobile clients and an admin SPA. The primary threat surface areas are:

| Threat | Category | Likelihood | Impact |
|---|---|---|---|
| Credential brute-force on auth endpoints | Auth | High | High |
| Stale admin tokens after role downgrade | Auth | Medium | High |
| Privilege escalation via race on PATCH /users | Access control | Low | Critical |
| Mass enumeration of catalog/users via admin API | Info disclosure | Medium | Medium |
| Large-body JSON injection / DoS | Input | Low | Medium |
| Missing security headers (MIME sniff, clickjack) | Headers | Low | Medium |
| Untracked admin mutations (no audit trail) | Compliance | High | High |

## Controls Implemented

### 1. Rate Limiting (`backend/src/index.ts`)

- **Global**: 200 req/min per IP (down from 100 — aligned with spec)
- **Auth routes** (`/api/v1/auth/otp/request`, `/otp/verify`, `/email/register`, `/email/login`, `/email/forgot`): **10 req/min** per IP via per-route `config.rateLimit` override
- **Admin routes** (`/api/admin/**`): **60 req/min** per IP via per-route override
- Error response: RFC 7807 `{ code: "RATE_LIMITED", message: "Retry after N" }`

### 2. Security Headers (`backend/src/index.ts`)

Registered `@fastify/helmet` with `contentSecurityPolicy: false` (API, no HTML):
- `X-Frame-Options: SAMEORIGIN` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-DNS-Prefetch-Control: off`
- `Strict-Transport-Security` — enforced in production
- `Referrer-Policy: no-referrer`

### 3. Audit Log

**Schema** (`prisma/schema.prisma`):
```prisma
model AuditLog {
  id, actorId, userId?, action, entityType, entityId,
  targetId?, targetType?, before Json?, after Json?,
  metadata Json?, ipAddress String?, createdAt DateTime
  actor User? @relation(userId)
}
```

**Utility** (`backend/src/utils/audit.ts`):
- `writeAuditLog(prisma, entry)` — append-only, swallows errors (audit never breaks business operations)
- Called in admin actions:
  - `PATCH /api/admin/catalog/tracks/:id` → action `PATCH_TRACK` (in `admin.service.ts`, pre-existing)
  - `PATCH /api/admin/users/:id` when role changed → action `CHANGE_ROLE`
  - `PATCH /api/admin/users/:id` when banned → action `BAN_USER` / `UNBAN_USER`
- Fields captured: `actorId`, `userId`, `before`, `after`, `metadata`, `ipAddress`

### 4. Token Invalidation on Role Change

**Schema**: `User.lastRoleChangeAt DateTime?` added.

**Flow**:
1. `PATCH /api/admin/users/:id` with `role` change → `prisma.user.update({ lastRoleChangeAt: new Date() })`
2. `verifyJwt` in `authenticate.ts`: after JWT signature check, fetches `user.lastRoleChangeAt` from DB
3. If `token.iat < lastRoleChangeAt`, returns `401 UNAUTHORIZED` with `"Token invalidated due to role change"`

**Trade-off**: 1 extra DB query per authenticated request. Acceptable for MVP; can be moved to Redis cache in Phase 2.

### 5. Input Validation & Body Size

- **Body size limit**: `bodyLimit: 10 * 1024` (10 KB) added to Fastify constructor
- All admin routes use Zod schemas (`PatchBodySchema`, `PatchUserBodySchema`, `ListQuerySchema`) with explicit field constraints
- Zod's `strict()` equivalent is `.refine()` — no unknown fields pass through
- Fastify's JSON schema `additionalProperties: false` can be layered on top if JSON Schema validation is preferred over Zod in future

## Audit Log Usage

| Action | Trigger | Data Captured |
|---|---|---|
| `PATCH_TRACK` | Admin publish/unpublish | `before.{isPublished, playbackStatus}`, `after.{isPublished, playbackStatus}` |
| `CHANGE_ROLE` | Admin role update | `before.role`, `after.role`, `ipAddress` |
| `BAN_USER` | Admin ban | `metadata.isBanned: true`, `ipAddress` |
| `UNBAN_USER` | Admin unban | `metadata.isBanned: false`, `ipAddress` |

Query for recent admin actions:
```sql
SELECT * FROM audit_logs
ORDER BY created_at DESC LIMIT 100;
```

Query for actions on a specific user:
```sql
SELECT * FROM audit_logs
WHERE entity_type = 'User' AND entity_id = '<userId>'
ORDER BY created_at DESC;
```

## Data Loss Prevention Strategy

1. **Audit logs are append-only** — no UPDATE or DELETE on `audit_logs` table (enforced by policy, not schema constraint yet)
2. **Token rotation** — refresh tokens are revoked on use; reuse of a rotated token detects session hijacking
3. **Role change invalidation** — stale tokens with elevated roles are rejected immediately after downgrade
4. **Rate limiting** — prevents bulk data exfiltration via enumeration
5. **Body size limit** — prevents large-payload attacks that could OOM the server

Recommended additions (not yet implemented):
- Row-level security on `audit_logs` (PostgreSQL RLS) — prevent app from deleting its own audit trail
- S3 object lock for audio assets — WORM for ingested content
- Separate audit DB user with INSERT-only privileges on `audit_logs`

## Remaining Vulnerabilities

| # | Vulnerability | Severity | Status |
|---|---|---|---|
| 1 | `verifyJwt` makes 1 DB query per request — no caching | Low | Acceptable for MVP |
| 2 | OTP rate limit is in-memory (resets on restart) | Medium | Move to Redis in Phase 2 |
| 3 | `additionalProperties: false` not enforced via JSON Schema (uses Zod) | Low | Zod handles unknown fields |
| 4 | No CSRF token on cookie-based refresh endpoint | Medium | `SameSite: strict` mitigates for mobile; add CSRF token for web admin |
| 5 | Admin endpoint body limit shares global 10 KB limit | Low | Consider lower limit (2 KB) for PATCH admin routes |
| 6 | `audit_logs` table has no write-protection at DB level | Medium | Add INSERT-only DB role for audit writes |
| 7 | Pre-existing type errors in `recommendations.service.ts` | Low | Pre-existing, separate scope |

## Security Checklist

- [x] Rate limiting: global 200 req/min
- [x] Rate limiting: auth routes 10 req/min
- [x] Rate limiting: admin routes 60 req/min
- [x] Security headers via `@fastify/helmet`
- [x] Audit log model with User relation
- [x] `writeAuditLog` utility (error-safe)
- [x] Audit on track publish/unpublish
- [x] Audit on user role change
- [x] Audit on user ban/unban
- [x] `lastRoleChangeAt` on User model
- [x] Token invalidation check in `verifyJwt`
- [x] `lastRoleChangeAt` updated on role change
- [x] Body size limit: 10 KB
- [x] Zod input validation on all admin endpoints
- [x] Migration SQL prepared (`20260407000000_add_audit_log`)
- [ ] Redis-backed OTP rate limiting (Phase 2)
- [ ] INSERT-only DB role for audit_logs (Ops task)
- [ ] CSRF token for admin SPA cookie flows (Phase 2)
