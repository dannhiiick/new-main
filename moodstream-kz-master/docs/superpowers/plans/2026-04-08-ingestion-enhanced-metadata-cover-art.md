# Ingestion: Enhanced Metadata + Cover Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract full release date and cover art from MP3 ID3 tags during ingestion; allow manual cover upload; save both to the database.

**Architecture:** `analyzeAudioBuffer` extracts date + embedded cover image (via `music-metadata`), uploads cover to MinIO and returns a 1-year presigned URL. A new `/cover` endpoint handles manual image uploads. `createTrackFromIngestion` saves `releaseDate` and `coverAssetUrl` to the Release record. The admin form shows the cover preview and a date picker.

**Tech Stack:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `music-metadata`, Fastify multipart, React.

---

## File Map

| File | Change |
|------|--------|
| `backend/src/utils/s3.ts` | Add `getPresignedGetUrl(key, expiresIn)` |
| `backend/src/modules/ingestion/ingestion.service.ts` | Extract date + cover; `uploadCoverBuffer`; update types; save to DB |
| `backend/src/modules/ingestion/ingestion.module.ts` | Add `POST /cover`; add `releaseDate`+`coverUrl` to `CreateTrackSchema` |
| `admin/src/pages/ingestion/IngestionPage.tsx` | Date field; cover preview + manual upload |

---

### Task 1: Add `getPresignedGetUrl` to s3.ts

**Files:**
- Modify: `backend/src/utils/s3.ts`

- [ ] **Step 1: Replace the file content with the extended version**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export async function getPresignedGetUrl(
  key: string,
  expiresIn = 31536000, // 1 year
): Promise<string> {
  const s3 = createS3Client();
  const bucket = process.env["S3_BUCKET"] ?? "moodstream-audio";
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: EXIT:0, no output

- [ ] **Step 3: Commit**

```bash
git add backend/src/utils/s3.ts
git commit -m "feat(s3): add getPresignedGetUrl utility"
```

---

### Task 2: Enhanced metadata + cover in ingestion.service.ts

**Files:**
- Modify: `backend/src/modules/ingestion/ingestion.service.ts`

- [ ] **Step 1: Update imports at top of file**

Replace existing imports block:
```typescript
import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { uploadBuffer, getPresignedGetUrl } from "../../utils/s3.js";
```

- [ ] **Step 2: Update `AnalyzeResult` interface — add `date` and `tempCoverUrl`**

```typescript
export interface AnalyzeResult {
  extracted: {
    title: string | null;
    artist: string | null;
    album: string | null;
    year: number | null;
    date: string | null;
    trackNumber: number | null;
    genre: string | null;
    durationMs: number | null;
  };
  suggestions: {
    trackTitle: string;
    releaseTitle: string;
    releaseType: "SINGLE" | "EP" | "ALBUM";
    isLocal: boolean;
    slug: string;
    matchedArtist: { id: string; name: string; slug: string; isLocal: boolean } | null;
    artistName: string;
  };
  tempAudioKey: string | null;
  tempCoverUrl: string | null;
}
```

- [ ] **Step 3: Update `CreateTrackInput` — add `releaseDate` and `coverUrl`**

```typescript
export interface CreateTrackInput {
  trackTitle: string;
  releaseTitle: string;
  releaseType: "SINGLE" | "EP" | "ALBUM";
  artistId: string | null;
  artistName: string;
  isLocal: boolean;
  durationMs: number;
  trackNumber: number | null;
  audioAssetKey: string | null;
  isPublished: boolean;
  releaseDate: string | null;
  coverUrl: string | null;
}
```

- [ ] **Step 4: Update `guessReleaseType` to use trackTotal**

Replace the existing `guessReleaseType` function:
```typescript
function guessReleaseType(
  album: string | null,
  title: string | null,
  trackTotal?: number,
): "SINGLE" | "EP" | "ALBUM" {
  if (!album || album === title) return "SINGLE";
  if (trackTotal && trackTotal > 1) return "ALBUM";
  const lower = album.toLowerCase();
  if (lower.includes(" ep") || lower.endsWith("ep")) return "EP";
  return "ALBUM";
}
```

- [ ] **Step 5: Update `analyzeAudioBuffer` — extract date, cover, call new guessReleaseType**

In the body of `analyzeAudioBuffer`, after existing variable declarations (`rawTrackNumber`, `rawGenre`, etc.) add:

```typescript
const rawDate = common?.date ?? (rawYear != null ? String(rawYear) : null);
const rawTrackTotal =
  typeof common?.track?.of === "number" ? common.track.of : undefined;
```

Then replace the existing `const releaseType = guessReleaseType(rawAlbum, rawTitle)` line with:
```typescript
const releaseType = guessReleaseType(rawAlbum, rawTitle, rawTrackTotal);
```

Then add the cover extraction block just before the `return` statement (after the existing `tempAudioKey` block):
```typescript
// Extract embedded cover art and upload to MinIO
let tempCoverUrl: string | null = null;
const picture = tags?.common.picture?.[0];
if (picture != null) {
  try {
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = mimeToExt[picture.format] ?? "jpg";
    const coverKey = `covers/tmp/${randomUUID()}.${ext}`;
    await uploadBuffer(Buffer.from(picture.data), coverKey, picture.format);
    tempCoverUrl = await getPresignedGetUrl(coverKey);
  } catch {
    tempCoverUrl = null;
  }
}
```

Then update the `return` statement to include the new fields:
```typescript
return {
  extracted: {
    title: rawTitle,
    artist: rawArtist,
    album: rawAlbum,
    year: rawYear ?? null,
    date: rawDate,
    trackNumber: rawTrackNumber,
    genre: rawGenre,
    durationMs: rawDuration,
  },
  suggestions: {
    trackTitle: title,
    releaseTitle,
    releaseType,
    isLocal,
    slug,
    matchedArtist: matchedArtist ?? null,
    artistName: matchedArtist?.name ?? artistName,
  },
  tempAudioKey,
  tempCoverUrl,
};
```

- [ ] **Step 6: Add `uploadCoverBuffer` export (for manual upload endpoint)**

Add after `analyzeAudioBuffer`:
```typescript
export async function uploadCoverBuffer(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const coverKey = `covers/tmp/${randomUUID()}.${ext}`;
  await uploadBuffer(buffer, coverKey, mimetype);
  return getPresignedGetUrl(coverKey);
}
```

- [ ] **Step 7: Update `createTrackFromIngestion` — save releaseDate and coverUrl**

In the `tx.release.create` call, add the two new fields:
```typescript
const release = await tx.release.create({
  data: {
    title: input.releaseTitle,
    slug: rSlug,
    releaseType: input.releaseType,
    artistId: artist.id,
    isPublished: input.isPublished,
    coverAssetUrl: input.coverUrl,
    releaseDate: input.releaseDate != null ? new Date(input.releaseDate) : null,
  },
  select: { id: true },
});
```

- [ ] **Step 8: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: EXIT:0, no output

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/ingestion/ingestion.service.ts
git commit -m "feat(ingestion): extract date + cover art, save to release"
```

---

### Task 3: Add `/cover` endpoint + update `CreateTrackSchema`

**Files:**
- Modify: `backend/src/modules/ingestion/ingestion.module.ts`

- [ ] **Step 1: Add `uploadCoverBuffer` to imports**

Replace the existing service imports:
```typescript
import {
  analyzeAudioBuffer,
  createTrackFromIngestion,
  searchArtists,
  uploadCoverBuffer,
} from "./ingestion.service.js";
```

- [ ] **Step 2: Add `releaseDate` and `coverUrl` to `CreateTrackSchema`**

Replace the existing `CreateTrackSchema`:
```typescript
const CreateTrackSchema = z.object({
  trackTitle: z.string().min(1).max(200),
  releaseTitle: z.string().min(1).max(200),
  releaseType: z.enum(["SINGLE", "EP", "ALBUM"]),
  artistId: z.string().nullable().default(null),
  artistName: z.string().min(1).max(200),
  isLocal: z.boolean(),
  durationMs: z.number().int().min(1),
  trackNumber: z.number().int().min(1).nullable().default(null),
  audioAssetKey: z.string().nullable().default(null),
  isPublished: z.boolean().default(false),
  releaseDate: z.string().nullable().default(null),
  coverUrl: z.string().nullable().default(null),
});
```

- [ ] **Step 3: Add `POST /cover` endpoint before the `GET /artists` route**

```typescript
// POST /api/admin/ingestion/cover
// Upload a cover image manually, get back a presigned URL
app.post(
  "/cover",
  { preHandler: [verifyAdminRole] },
  async (request, reply) => {
    const data = await request.file();
    if (!data) {
      const body: ProblemDetails = { code: "VALIDATION_ERROR", message: "No file uploaded." };
      return reply.status(400).send(body);
    }
    if (!data.mimetype.startsWith("image/")) {
      const body: ProblemDetails = {
        code: "VALIDATION_ERROR",
        message: "Only image files are accepted (JPEG, PNG, WebP).",
      };
      return reply.status(400).send(body);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const coverUrl = await uploadCoverBuffer(buffer, data.filename, data.mimetype);
    return reply.send({ coverUrl });
  },
);
```

- [ ] **Step 4: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: EXIT:0, no output

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/ingestion/ingestion.module.ts
git commit -m "feat(ingestion): add /cover endpoint, add releaseDate+coverUrl to create schema"
```

---

### Task 4: Update IngestionPage.tsx

**Files:**
- Modify: `admin/src/pages/ingestion/IngestionPage.tsx`

- [ ] **Step 1: Update `AnalyzeResult` interface — add `date` and `tempCoverUrl`**

```typescript
interface AnalyzeResult {
  extracted: {
    title: string | null
    artist: string | null
    album: string | null
    year: number | null
    date: string | null
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
  tempCoverUrl: string | null
}
```

- [ ] **Step 2: Update `FormState` interface — add `releaseDate` and `coverUrl`**

```typescript
interface FormState {
  trackTitle: string
  releaseTitle: string
  releaseType: 'SINGLE' | 'EP' | 'ALBUM'
  artistId: string | null
  artistName: string
  isLocal: boolean
  durationMs: number
  trackNumber: number | null
  audioAssetKey: string | null
  isPublished: boolean
  releaseDate: string | null
  coverUrl: string | null
}
```

- [ ] **Step 3: Update `EMPTY_FORM`**

```typescript
const EMPTY_FORM: FormState = {
  trackTitle: '',
  releaseTitle: '',
  releaseType: 'SINGLE',
  artistId: null,
  artistName: '',
  isLocal: false,
  durationMs: 0,
  trackNumber: null,
  audioAssetKey: null,
  isPublished: false,
  releaseDate: null,
  coverUrl: null,
}
```

- [ ] **Step 4: Add `uploadCoverFile` helper function (after `uploadForAnalyze`)**

```typescript
async function uploadCoverFile(file: File): Promise<string> {
  const token = getAdminToken()
  const fd = new FormData()
  fd.append('file', file)
  const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000'
  const res = await fetch(`${BASE_URL}/api/admin/ingestion/cover`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const b = (await res.json()) as { message?: string }
      if (b.message) msg = b.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  const data = (await res.json()) as { coverUrl: string }
  return data.coverUrl
}
```

- [ ] **Step 5: Add cover upload state + ref in `IngestionPage` component**

Add these after the existing state declarations (around line 130):
```typescript
const [uploadingCover, setUploadingCover] = useState(false)
const coverInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 6: Add `handleCoverFile` handler inside the component (after `clearArtist`)**

```typescript
async function handleCoverFile(f: File) {
  if (!f.type.startsWith('image/')) return
  setUploadingCover(true)
  try {
    const coverUrl = await uploadCoverFile(f)
    setForm(p => ({ ...p, coverUrl }))
  } catch {
    // silent — user can try again
  } finally {
    setUploadingCover(false)
  }
}
```

- [ ] **Step 7: Update `handleFile` to populate `releaseDate` and `coverUrl` from analyze result**

In the `setForm({...})` call inside `handleFile`, replace:
```typescript
audioAssetKey: result.tempAudioKey ?? null,
isPublished: false,
```
with:
```typescript
audioAssetKey: result.tempAudioKey ?? null,
isPublished: false,
releaseDate: result.extracted.date ?? null,
coverUrl: result.tempCoverUrl ?? null,
```

- [ ] **Step 8: Update `handleReset` to clear new state**

Add to `handleReset`:
```typescript
setUploadingCover(false)
if (coverInputRef.current) coverInputRef.current.value = ''
```

- [ ] **Step 9: Add cover preview + upload UI inside the form (before the Toggles block)**

Add this `<Field>` block before the `{/* Toggles */}` comment:
```tsx
{/* Cover art */}
<Field label="Обложка">
  <div className="flex items-center gap-3">
    {form.coverUrl ? (
      <img
        src={form.coverUrl}
        alt="cover"
        className="w-16 h-16 rounded-lg object-cover border border-border-default"
      />
    ) : (
      <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 text-2xl border border-border-default">
        ♪
      </div>
    )}
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => coverInputRef.current?.click()}
        disabled={uploadingCover}
        className="text-xs text-zinc-400 hover:text-white border border-border-default rounded px-2.5 py-1 hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        {uploadingCover ? 'Загружаю…' : form.coverUrl ? 'Заменить' : 'Загрузить обложку'}
      </button>
      {form.coverUrl && (
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, coverUrl: null }))}
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Убрать
        </button>
      )}
    </div>
    <input
      ref={coverInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={e => {
        const f = e.target.files?.[0]
        if (f) void handleCoverFile(f)
      }}
    />
  </div>
</Field>
```

- [ ] **Step 10: Add `Дата релиза` field inside the form (after the Duration + track number grid)**

Add after the `{/* Duration + track number */}` block:
```tsx
{/* Release date */}
<Field label="Дата релиза">
  <input
    className="input"
    type="date"
    value={form.releaseDate ?? ''}
    onChange={e => setForm(p => ({ ...p, releaseDate: e.target.value || null }))}
  />
</Field>
```

- [ ] **Step 11: Typecheck admin**

Run: `cd admin && npm run typecheck`
Expected: EXIT:0, no output

- [ ] **Step 12: Commit**

```bash
git add admin/src/pages/ingestion/IngestionPage.tsx
git commit -m "feat(admin): cover preview, manual cover upload, release date field"
```

---

### Task 5: Manual verification

- [ ] Restart backend: `cd backend && npm run dev`
- [ ] Restart admin: `cd admin && npm run dev`
- [ ] Upload an MP3 with embedded cover art → verify cover preview appears in form
- [ ] Upload an MP3 without cover → verify placeholder shown, manual upload works
- [ ] Verify date field pre-filled from ID3 tags
- [ ] Create track → verify in DB: `releaseDate` and `coverAssetUrl` are set
- [ ] Check MinIO (`http://localhost:9001`) → files in `moodstream-audio/covers/tmp/`
