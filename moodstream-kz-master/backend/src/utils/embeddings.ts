const HF_API_URL =
  "https://api-inference.huggingface.co/models/laion/larger_clap_music_and_speech";

const EMBEDDING_DIM = 512;

/**
 * Generate a 512-dim CLAP audio embedding via HuggingFace Inference API.
 * Sends raw audio buffer; returns null on API error or missing token.
 * Non-blocking — ingestion continues even if embedding fails.
 */
export async function getAudioEmbedding(audioBuffer: Buffer): Promise<number[] | null> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) return null;

  // CLAP works best on ≤30s of audio — slice to first 30s worth of bytes (~3.6MB at 128kbps)
  const sliced = audioBuffer.length > 3_840_000 ? audioBuffer.slice(0, 3_840_000) : audioBuffer;

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "audio/mpeg",
        "x-wait-for-model": "true",
      },
      body: sliced,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return null;

    const json = (await response.json()) as unknown;

    // HF feature-extraction returns [[...floats]] or [...floats]
    const flat = Array.isArray(json)
      ? Array.isArray(json[0])
        ? (json[0] as number[])
        : (json as number[])
      : null;

    if (!flat || flat.length !== EMBEDDING_DIM) return null;
    return flat;
  } catch {
    return null;
  }
}

/**
 * Format a number[] as a pgvector literal: '[0.1,0.2,...]'
 */
export function formatVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Compute cosine similarity between two vectors in JS (fallback, no DB needed).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
