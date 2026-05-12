# Ingestion MinIO Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MP3 uploaded via admin ingestion is saved to MinIO and the track becomes PLAYABLE immediately.

**Architecture:** On `/analyze`, the audio buffer is uploaded to `tmp/{uuid}.mp3` in MinIO and the key is returned in `tempAudioKey`. The frontend passes this key to `/create`, which sets `playbackStatus: "PLAYABLE"` when the key is present.

**Tech Stack:** `@aws-sdk/client-s3` (already installed), Node.js `crypto.randomUUID`, Fastify multipart, React + TanStack Query admin SPA.

---

### Task 1: Create S3 utility

**Files:**
- Create: `backend/src/utils/s3.ts`

- [ ] **Step 1: Write the file**

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3ClientConfig } from "@aws-sdk/client-s3";

export function createS3Client(): S3Client {
  const endpoint = process.env["S3_ENDPOINT"];
  const config: S3ClientConfig = {
    region: process.env["S3_REGION"] ?? "us-east-1",
    credentials: {
      accessKeyId: process.env["S3_ACCESS_KEY"] ?? "",
      secretAccessKey: process.env["S3_SECRET_KEY"] ?? "",
    },
    forcePathStyle: true,
  };
  if (endpoint != null) config.endpoint = endpoint;
  return new S3Client(config);
}

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType = "audio/mpeg",
): Promise<void> {
  const s3 = createS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "moodstream-audio";
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd backend && npm run typecheck`
Expected: no errors in `src/utils/s3.ts`

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/s3.ts
git commit -m "feat(ingestion): add S3 upload utility"
```

---

### Task 2: Update ingestion.service.ts

**Files:**
- Modify: `backend/src/modules/ingestion/ingestion.service.ts`

Changes:
1. Add `tempAudioKey: string | null` to `AnalyzeResult`
2. Upload buffer to MinIO in `analyzeAudioBuffer`
3. Set `playbackStatus: "PLAYABLE"` when `audioAssetKey` is present in `createTrackFromIngestion`

- [ ] **Step 1: Add imports at top of file**

```typescript
import { randomUUID } from "crypto";
import { uploadBuffer } from "../../utils/s3.js";
```

- [ ] **Step 2: Add `tempAudioKey` to `AnalyzeResult` interface**

```typescript
export interface AnalyzeResult {
  extracted: {
    title: string | null
    artist: string | null
    album: string | null
    year: number | null
    trackNumber: number | null
    genre: string | null
    durationMs: number | null
  }
  suggestions: {
    trackTitle: string
    releaseTitle: string
    releaseType: "SINGLE" | "EP" | "ALBUM"
    isLocal: boolean
    slug: string
    matchedArtist: { id: string; name: string; slug: string; isLocal: boolean } | null
    artistName: string
  }
  tempAudioKey: string | null
}
```

- [ ] **Step 3: Add upload logic in `analyzeAudioBuffer` before the return statement**

```typescript
// Upload buffer to MinIO — errors are non-fatal (track stays PROCESSING)
let tempAudioKey: string | null = null;
try {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "mp3";
  tempAudioKey = `tmp/${randomUUID()}.${ext}`;
  await uploadBuffer(buffer, tempAudioKey);
} catch {
  tempAudioKey = null;
}

return {
  extracted: { ... },   // existing fields unchanged
  suggestions: { ... }, // existing fields unchanged
  tempAudioKey,
};
```

- [ ] **Step 4: Update `playbackStatus` in `createTrackFromIngestion`**

In the `tx.track.create` call, change:
```typescript
playbackStatus: "PROCESSING",
```
to:
```typescript
playbackStatus: input.audioAssetKey ? "PLAYABLE" : "PROCESSING",
```

- [ ] **Step 5: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/ingestion/ingestion.service.ts
git commit -m "feat(ingestion): upload audio to MinIO on analyze, set PLAYABLE on create"
```

---

### Task 3: Update IngestionPage.tsx

**Files:**
- Modify: `admin/src/pages/ingestion/IngestionPage.tsx`

Changes:
1. Add `tempAudioKey` to the local `AnalyzeResult` interface
2. Use `result.tempAudioKey` when pre-filling the form after analyze

- [ ] **Step 1: Add `tempAudioKey` to local `AnalyzeResult` interface (line 6-25)**

```typescript
interface AnalyzeResult {
  extracted: {
    title: string | null
    artist: string | null
    album: string | null
    year: number | null
    trackNumber: number | null
    genre: string | null
    durationMs: number | null
  }
  suggestions: {
    trackTitle: string
    releaseTitle: string
    releaseType: 'SINGLE' | 'EP' | 'ALBUM'
    isLocal: boolean
    slug: string
    matchedArtist: { id: string; name: string; slug: string; isLocal: boolean } | null
    artistName: string
  }
  tempAudioKey: string | null
}
```

- [ ] **Step 2: Use `tempAudioKey` in `handleFile` (line 163-174)**

Change:
```typescript
audioAssetKey: null,
```
to:
```typescript
audioAssetKey: result.tempAudioKey ?? null,
```

- [ ] **Step 3: Typecheck admin**

Run: `cd admin && npm run typecheck`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add admin/src/pages/ingestion/IngestionPage.tsx
git commit -m "feat(admin): pass tempAudioKey from analyze to create"
```

---

### Task 4: Manual verification

- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start admin: `cd admin && npm run dev`
- [ ] Login as ADMIN, go to Ingestion page
- [ ] Upload an MP3 — verify no error in backend logs
- [ ] Click "Создать трек" — verify track created with `playbackStatus: PLAYABLE`
- [ ] Check MinIO (`http://localhost:9001`) — file should appear in `moodstream-audio/tmp/`
- [ ] Try playing the track in the mobile app or via `GET /api/v1/player/stream/:trackId`
