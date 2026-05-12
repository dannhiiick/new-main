import { randomUUID } from "crypto";
import { uploadBuffer, getPresignedGetUrl } from "./s3.js";

const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";
const USER_AGENT = "MoodStreamKZ/1.0 (https://moodstream.kz)";

interface MBSearchResult {
  releases?: { id: string }[];
}

export async function fetchCoverFromMusicBrainz(
  artist: string,
  album: string,
): Promise<string | null> {
  try {
    // 1. Search MusicBrainz for release by artist + album name
    const query = `artist:"${artist}" AND release:"${album}"`;
    const searchUrl = `${MB_BASE}/release/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;

    const mbRes = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!mbRes.ok) return null;

    const mbData = (await mbRes.json()) as MBSearchResult;
    const mbid = mbData.releases?.[0]?.id;
    if (!mbid) return null;

    // 2. Fetch 250px front cover from Cover Art Archive
    const caaRes = await fetch(`${CAA_BASE}/release/${mbid}/front-250`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
      // fetch follows 307 redirects automatically
    });
    if (!caaRes.ok) return null;

    const imageBytes = Buffer.from(await caaRes.arrayBuffer());
    const contentType = caaRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const coverKey = `covers/tmp/${randomUUID()}.${ext}`;
    await uploadBuffer(imageBytes, coverKey, contentType);
    return getPresignedGetUrl(coverKey);
  } catch {
    return null;
  }
}
