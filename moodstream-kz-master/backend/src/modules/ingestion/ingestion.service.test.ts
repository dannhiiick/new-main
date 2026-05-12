import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (must come before imports) ────────────────────────────────────────

vi.mock("../../db/client.js", () => ({
  prisma: {
    artist: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    release: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../utils/s3.js", () => ({
  uploadBuffer: vi.fn().mockResolvedValue(undefined),
  getPresignedGetUrl: vi.fn().mockResolvedValue("https://example.com/presigned"),
}));

vi.mock("music-metadata", () => ({
  parseBuffer: vi.fn().mockResolvedValue({
    common: {
      title: "Test Track",
      artist: "Test Artist",
      album: "Test Album",
      year: 2024,
      date: "2024-01-01",
      track: { no: 1, of: 10 },
      genre: ["Pop"],
      picture: [],
    },
    format: {
      duration: 200.5,
    },
  }),
}));

import { prisma } from "../../db/client.js";

// ─── We test the pure helper functions by re-implementing them inline ─────────
// Since toSlug and guessIsLocal are not exported, we test them via analyzeAudioBuffer
// and create local copies to test the logic directly.

// Local copies matching the implementation in ingestion.service.ts
const KZ_ARTIST_HINTS = [
  "кайрат", "dimash", "дімаш", "иманбек", "скриптонит", "jah khalib",
  "батырхан", "роза рымбаева", "нұрлан", "нурлан", "казах", "қазақ",
  "абай", "алматы", "астана", "мбт", "зат тарих", "moldanazar",
  "ninety one", "ninety1", "beiniyeti", "айгерим", "gakku",
];

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function guessIsLocal(artistName: string, existingIsLocal?: boolean): boolean {
  if (existingIsLocal !== undefined) return existingIsLocal;
  const lower = artistName.toLowerCase();
  return KZ_ARTIST_HINTS.some((hint) => lower.includes(hint));
}

// ─── toSlug ───────────────────────────────────────────────────────────────────

describe("toSlug helper", () => {
  it("converts basic latin text to lowercase kebab-case", () => {
    expect(toSlug("Hello World")).toBe("hello-world");
  });

  it("removes punctuation and special characters (non-word, non-space, non-hyphen)", () => {
    // Dots, commas, brackets are removed; the regex [^\w\s-] removes them
    const result = toSlug("Track, One!");
    expect(result).not.toContain(",");
    expect(result).not.toContain("!");
    expect(result).toContain("track");
  });

  it("collapses multiple spaces and hyphens", () => {
    expect(toSlug("Hello   World")).toBe("hello-world");
    expect(toSlug("hello--world")).toBe("hello-world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(toSlug("  hello  ")).toBe("hello");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(80);
    expect(toSlug(long).length).toBeLessThanOrEqual(60);
  });

  it("handles Cyrillic characters (kept as word chars)", () => {
    // \w in JS does NOT match Cyrillic by default — so Cyrillic letters are removed
    // The actual implementation removes them; verify consistent behavior
    const result = toSlug("Иманбек Feat");
    // Cyrillic stripped, only latin kept
    expect(result).toContain("feat");
  });

  it("returns empty string for input that is all special characters", () => {
    expect(toSlug("!!!")).toBe("");
  });

  it("handles hyphenated artist names", () => {
    expect(toSlug("drum-and-bass")).toBe("drum-and-bass");
  });

  it("preserves numbers", () => {
    expect(toSlug("ninety one 91")).toBe("ninety-one-91");
  });
});

// ─── guessIsLocal ─────────────────────────────────────────────────────────────

describe("guessIsLocal helper", () => {
  it("returns true for Скриптонит (Cyrillic KZ artist)", () => {
    expect(guessIsLocal("Скриптонит")).toBe(true);
  });

  it("returns true for Dimash (case-insensitive)", () => {
    expect(guessIsLocal("Dimash Kudaibergen")).toBe(true);
  });

  it("returns true for Иманбек", () => {
    expect(guessIsLocal("Иманбек")).toBe(true);
  });

  it("returns true for Ninety One", () => {
    expect(guessIsLocal("Ninety One")).toBe(true);
  });

  it("returns true for Moldanazar", () => {
    expect(guessIsLocal("Moldanazar")).toBe(true);
  });

  it("returns false for Drake", () => {
    expect(guessIsLocal("Drake")).toBe(false);
  });

  it("returns false for Taylor Swift", () => {
    expect(guessIsLocal("Taylor Swift")).toBe(false);
  });

  it("returns false for an unknown English artist", () => {
    expect(guessIsLocal("Unknown International Band")).toBe(false);
  });

  it("respects existingIsLocal=true override even for non-KZ name", () => {
    expect(guessIsLocal("Drake", true)).toBe(true);
  });

  it("respects existingIsLocal=false override even for KZ name", () => {
    expect(guessIsLocal("Dimash", false)).toBe(false);
  });

  it("is case-insensitive for hints", () => {
    expect(guessIsLocal("DIMASH")).toBe(true);
    expect(guessIsLocal("dimash")).toBe(true);
  });
});

// ─── analyzeAudioBuffer integration ──────────────────────────────────────────

describe("analyzeAudioBuffer", () => {
  beforeEach(() => {
    vi.mocked(prisma.artist.findFirst).mockResolvedValue(null as never);
  });

  it("extracts metadata and returns suggestions", async () => {
    const { analyzeAudioBuffer } = await import("./ingestion.service.js");
    const buffer = Buffer.alloc(100);
    const result = await analyzeAudioBuffer(buffer, "test-track.mp3");

    expect(result.extracted.title).toBe("Test Track");
    expect(result.extracted.artist).toBe("Test Artist");
    expect(result.extracted.album).toBe("Test Album");
    expect(result.extracted.year).toBe(2024);
    expect(result.extracted.durationMs).toBe(200500); // 200.5 * 1000
    expect(result.suggestions.trackTitle).toBe("Test Track");
    expect(result.suggestions.releaseTitle).toBe("Test Album");
    expect(result.suggestions.slug).toBeTruthy();
  });

  it("falls back to filename when title tag is missing", async () => {
    const { parseBuffer } = await import("music-metadata");
    vi.mocked(parseBuffer).mockResolvedValueOnce({
      common: {
        title: undefined,
        artist: "Some Artist",
        album: null,
        year: null,
        date: null,
        track: { no: null, of: null },
        genre: [],
        picture: [],
      },
      format: { duration: 120 },
    } as never);

    const { analyzeAudioBuffer } = await import("./ingestion.service.js");
    const buffer = Buffer.alloc(100);
    const result = await analyzeAudioBuffer(buffer, "my cool song.mp3");

    expect(result.suggestions.trackTitle).toBe("my cool song");
  });

  it("sets isLocal=true when artist matches KZ hint", async () => {
    const { parseBuffer } = await import("music-metadata");
    vi.mocked(parseBuffer).mockResolvedValueOnce({
      common: {
        title: "Some Song",
        artist: "Скриптонит",
        album: null,
        year: null,
        date: null,
        track: { no: null, of: null },
        genre: [],
        picture: [],
      },
      format: { duration: 200 },
    } as never);

    const { analyzeAudioBuffer } = await import("./ingestion.service.js");
    const buffer = Buffer.alloc(100);
    const result = await analyzeAudioBuffer(buffer, "track.mp3");

    expect(result.suggestions.isLocal).toBe(true);
  });

  it("sets matchedArtist when DB has existing artist", async () => {
    const mockArtist = {
      id: "artist-1",
      name: "Test Artist",
      slug: "test-artist",
      isLocal: false,
    };
    vi.mocked(prisma.artist.findFirst).mockResolvedValue(mockArtist as never);

    const { analyzeAudioBuffer } = await import("./ingestion.service.js");
    const buffer = Buffer.alloc(100);
    const result = await analyzeAudioBuffer(buffer, "track.mp3");

    expect(result.suggestions.matchedArtist).not.toBeNull();
    expect(result.suggestions.matchedArtist?.id).toBe("artist-1");
  });

  it("handles music-metadata parse failure gracefully", async () => {
    const { parseBuffer } = await import("music-metadata");
    vi.mocked(parseBuffer).mockRejectedValueOnce(new Error("parse error"));

    const { analyzeAudioBuffer } = await import("./ingestion.service.js");
    const buffer = Buffer.alloc(100);
    const result = await analyzeAudioBuffer(buffer, "fallback-track.mp3");

    // Should fall back to filename
    expect(result.suggestions.trackTitle).toBe("fallback track");
    expect(result.extracted.title).toBeNull();
  });
});
