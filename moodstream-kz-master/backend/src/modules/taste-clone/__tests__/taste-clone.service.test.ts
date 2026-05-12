import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    publicProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    cloneSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    playEvent: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

// Mock recommendations service
vi.mock("../../recommendations/recommendations.service.js", () => ({
  getRecommendations: vi.fn(),
}));

import { prisma } from "../../../db/client.js";
import { getRecommendations } from "../../recommendations/recommendations.service.js";
import {
  startCloneSession,
  endCloneSession,
  getActiveCloneSession,
  getCloneRecommendations,
  ProfileNotFoundError,
  ProfilePrivateError,
  CloneSessionExistsError,
} from "../taste-clone.service.js";

const mockProfileFindUnique = prisma.publicProfile.findUnique as ReturnType<typeof vi.fn>;
const mockSessionFindFirst = prisma.cloneSession.findFirst as ReturnType<typeof vi.fn>;
const mockSessionCreate = prisma.cloneSession.create as ReturnType<typeof vi.fn>;
const mockSessionUpdateMany = prisma.cloneSession.updateMany as ReturnType<typeof vi.fn>;
const mockGetRecs = getRecommendations as ReturnType<typeof vi.fn>;

function makeProfile(isPublic = true) {
  return { id: "profile-1", userId: "source-user", displayName: "Clone Me", isPublic, genreTags: ["pop"] };
}

function makeSession() {
  return {
    id: "sess-1",
    clonerUserId: "user-1",
    sourceProfileId: "profile-1",
    isActive: true,
    startedAt: new Date("2025-01-01"),
    sourceProfile: makeProfile(),
  };
}

function makeRecsResult(trackCount = 3) {
  return {
    tracks: Array.from({ length: trackCount }, (_, i) => ({
      trackId: `t${i}`,
      score: 0.9 - i * 0.1,
      reasons: [],
      track: { id: `t${i}`, title: `Track ${i}`, durationMs: 180000, artists: [], coverUrl: null, playbackStatus: 'PLAYABLE', offlineEligible: true, isLocal: false },
    })),
    profile: { id: "p1", userId: "u1" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startCloneSession", () => {
  it("creates a clone session for a public profile", async () => {
    mockProfileFindUnique.mockResolvedValue(makeProfile(true));
    mockSessionFindFirst.mockResolvedValue(null);
    mockSessionCreate.mockResolvedValue({ id: "sess-1", sourceProfileId: "profile-1", startedAt: new Date() });

    const session = await startCloneSession("user-1", "profile-1");

    expect(session.sourceProfileId).toBe("profile-1");
    expect(mockSessionCreate).toHaveBeenCalled();
  });

  it("throws ProfileNotFoundError when profile doesn't exist", async () => {
    mockProfileFindUnique.mockResolvedValue(null);

    await expect(startCloneSession("user-1", "profile-1")).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws ProfilePrivateError for private profiles", async () => {
    mockProfileFindUnique.mockResolvedValue(makeProfile(false));

    await expect(startCloneSession("user-1", "profile-1")).rejects.toThrow(ProfilePrivateError);
  });

  it("throws CloneSessionExistsError when active session exists", async () => {
    mockProfileFindUnique.mockResolvedValue(makeProfile(true));
    mockSessionFindFirst.mockResolvedValue(makeSession());

    await expect(startCloneSession("user-1", "profile-1")).rejects.toThrow(CloneSessionExistsError);
  });
});

describe("endCloneSession", () => {
  it("deactivates active session", async () => {
    mockSessionUpdateMany.mockResolvedValue({ count: 1 });

    await endCloneSession("user-1");

    expect(mockSessionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
    );
  });
});

describe("getActiveCloneSession", () => {
  it("returns active session when it exists", async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession());

    const result = await getActiveCloneSession("user-1");

    expect(result).not.toBeNull();
    expect(result?.sourceProfile.displayName).toBe("Clone Me");
  });

  it("returns null when no active session", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    const result = await getActiveCloneSession("user-1");

    expect(result).toBeNull();
  });
});

describe("getCloneRecommendations", () => {
  it("returns own recs when no active clone session", async () => {
    mockSessionFindFirst.mockResolvedValue(null);
    mockGetRecs.mockResolvedValue(makeRecsResult(5));

    const result = await getCloneRecommendations("user-1", 20);

    expect(mockGetRecs).toHaveBeenCalledWith("user-1", 20);
    expect(result.tracks).toHaveLength(5);
  });

  it("blends source and own recs when clone session is active", async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession());
    mockProfileFindUnique.mockResolvedValue({ userId: "source-user" });
    // source gets 14 tracks (70%), own gets 6 (30%)
    mockGetRecs
      .mockResolvedValueOnce(makeRecsResult(14)) // source
      .mockResolvedValueOnce(makeRecsResult(6));  // own (different track ids would deduplicate)

    const result = await getCloneRecommendations("user-1", 20);

    expect(result.tracks.length).toBeGreaterThan(0);
    expect(result.tracks.length).toBeLessThanOrEqual(20);
  });
});
