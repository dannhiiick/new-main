---
tags: [report, backend, admin, sprint]
date: 2026-04-07
type: sprint-report
---
# Sprint Fixes Report

## Fixed Issues

### Fix 1: GET /api/admin/catalog/artists and /api/admin/catalog/releases
- Backend: routes already existed in `admin.service.ts` as `adminGetArtists` and `adminGetReleases` (with cursor pagination, `_count { trackArtists }`, no isPublished filter), but were **not registered** in `admin.module.ts`.
- Added `GET /api/admin/catalog/artists` and `GET /api/admin/catalog/releases` routes to `backend/src/modules/admin/admin.module.ts`.

### Fix 2: PATCH /api/admin/users/:id
- Backend: `adminUpdateUser` service function already existed (last-admin guard, self-modify guard, role mapping LISTENER/CATALOG_MANAGER/ADMIN), but the route was **missing** from `admin.module.ts`.
- Added `PATCH /api/admin/users/:id` route with `PatchUserBodySchema` validation and structured error handling for `SELF_MODIFY_FORBIDDEN` / `LAST_ADMIN` codes.

### Fix 3: ArtistList.tsx — switched to admin endpoint
- Was hitting public `/api/v1/catalog/search` (only published, limited fields).
- Now calls `/api/admin/catalog/artists` with debounced search + cursor pagination.
- Shows `trackCount`, KZ/Verified/Published badges, loading skeleton, error retry, empty state.

### Fix 4: ReleaseList.tsx — switched to admin endpoint
- Was hitting public `/api/v1/catalog/search` (only published, no artistName/trackCount).
- Now calls `/api/admin/catalog/releases` with debounced search + cursor pagination.
- Shows `trackCount`, artist name, type badge, published badge, loading skeleton, error retry.

### Fix 5: UsersPage.tsx — role dropdown
- Added `RoleSelect` component per user row that calls `PATCH /api/admin/users/:id`.
- Optimistic local state with rollback on error; invalidates `['admin', 'users']` query on success.
- Added 6th column "Изменить роль" to the table.

### Fix 6: TrackDetails.transparency — non-optional
- `admin/src/lib/types.ts`: changed `transparency?` to `transparency` (required) in `TrackDetails`.

## Typecheck Results

| Service | Result |
|---------|--------|
| `admin/` | **PASS** — 0 errors |
| `backend/` | Pre-existing errors in `charts.service.ts`, `player.module.ts`, `authenticate.ts`, `audit.ts`, `redis.ts` — none in changed files (`admin.module.ts`, `admin.service.ts`) |

## Remaining Issues

- Backend pre-existing TS errors (not introduced by this sprint):
  - `charts.service.ts`: `action`/`suspicious`/`position`/`chartScore` schema drift
  - `player.module.ts`: `action` field missing from `PlayEvent` schema
  - `authenticate.ts`: `lastRoleChangeAt` field missing from Prisma schema
  - `audit.ts`: `exactOptionalPropertyTypes` incompatibility with JSON fields
  - `redis.ts`: ioredis import style mismatch
- `adminUpdateUser` currently ignores `isBanned` field (no `isBanned` column in Prisma User schema); the service signature accepts it but does not persist it.
