import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

vi.mock("../../../db/client.js", () => ({
  prisma: {
    recommendationFeedback: { findMany: vi.fn() },
    track: { findMany: vi.fn() },
  },
}));

vi.mock("../../../utils/redis.js", () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../../db/client.js";
import { redis } from "../../../utils/redis.js";
import { parseMoodQuery, searchByMood } from "../mood-machine.service.js";

const mockCreate = vi.fn();
(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  messages: { create: mockCreate },
}));

const mockRedisGet = redis.get as ReturnType<typeof vi.fn>;
const mockRedisSet = redis.setex as ReturnType<typeof vi.fn>;
const mockFeedback = prisma.recommendationFeedback.findMany as ReturnType<typeof vi.fn>;
const mockTrack = prisma.track.findMany as ReturnType<typeof vi.fn>;

const validMoodResponse = JSON.stringify({
  energy: 0.3,
  valence: 0.2,
  danceability: 0.2,
  tempo: "slow",
  mood: ["sad", "rainy"],
});

function makeTrack(id: string) {
  return {
    id,
    title: `Track ${id}`,
    durationMs: 200_000,
    isLocal: false,
    offlineEligible: true,
    playbackStatus: "PLAYABLE",
    release: { coverAssetUrl: null },
    artists: [{ artist: { id: "a1", name: "Artist", slug: "artist" } }],
    audioFeatures: { energy: 0.3, valence: 0.2, danceability: 0.2, bpm: 60 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["ANTHROPIC_API_KEY"] = "test-key";
  mockRedisGet.mockResolvedValue(null);
  mockRedisSet.mockResolvedValue("OK");
  mockFeedback.mockResolvedValue([]);
});

describe("parseMoodQuery", () => {
  it("returns cached params when available", async () => {
    mockRedisGet.mockResolvedValue(validMoodResponse);

    const result = await parseMoodQuery("rainy sad evening");

    expect(result.energy).toBe(0.3);
    expect(result.mood).toContain("sad");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls Claude API and parses response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: validMoodResponse }],
    });

    const result = await parseMoodQuery("rainy sad evening");

    expect(result.energy).toBe(0.3);
    expect(result.valence).toBe(0.2);
    expect(result.tempo).toBe("slow");
    expect(result.mood).toContain("sad");
  });

  it("returns defaults when Claude returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
    });

    const result = await parseMoodQuery("something");

    expect(result.energy).toBe(0.5);
    expect(result.valence).toBe(0.5);
    expect(result.tempo).toBe("medium");
  });

  it("clamps energy and valence to [0,1]", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({
        energy: 5.0, valence: -2.0, danceability: 0.5, tempo: "fast", mood: ["happy"],
      })}],
    });

    const result = await parseMoodQuery("extreme");

    expect(result.energy).toBe(1.0);
    expect(result.valence).toBe(0.0);
  });
});

describe("searchByMood", () => {
  it("returns tracks matching mood parameters", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: validMoodResponse }],
    });
    mockTrack.mockResolvedValue([makeTrack("t1"), makeTrack("t2")]);

    const result = await searchByMood("rainy evening", "user-1", 10);

    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.query).toBe("rainy evening");
    expect(result.params.mood).toContain("sad");
  });

  it("returns cached result when available", async () => {
    const cached = {
      query: "cached", params: { energy: 0.5, valence: 0.5, danceability: 0.5, tempo: "medium", mood: [] },
      tracks: [{ id: "t1", title: "Cached", durationMs: 180000, artists: [], coverUrl: null, playbackStatus: "PLAYABLE", offlineEligible: true, isLocal: false }],
      cached: false,
    };
    mockRedisGet.mockResolvedValue(JSON.stringify(cached));

    const result = await searchByMood("cached", "user-1", 10);

    expect(result.cached).toBe(true);
    expect(result.tracks).toHaveLength(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("excludes hidden tracks", async () => {
    mockFeedback.mockResolvedValue([{ kind: "HIDE_TRACK", trackId: "t1" }]);
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: validMoodResponse }] });
    mockTrack.mockResolvedValue([makeTrack("t2")]);

    const result = await searchByMood("sad evening", "user-1", 10);

    const ids = result.tracks.map((t) => t.id);
    expect(ids).not.toContain("t1");
  });
});
