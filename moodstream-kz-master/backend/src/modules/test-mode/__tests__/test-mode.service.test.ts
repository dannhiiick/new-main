import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client.js", () => ({
  prisma: {
    testSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    testInteraction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    libraryItem: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "../../../db/client.js";
import {
  startTestSession,
  getActiveSession,
  endTestSession,
  recordInteraction,
  ActiveSessionExistsError,
  SessionNotFoundError,
} from "../test-mode.service.js";

const mockSessionFindFirst = prisma.testSession.findFirst as ReturnType<typeof vi.fn>;
const mockSessionCreate = prisma.testSession.create as ReturnType<typeof vi.fn>;
const mockSessionUpdate = prisma.testSession.update as ReturnType<typeof vi.fn>;
const mockInteractionCreate = prisma.testInteraction.create as ReturnType<typeof vi.fn>;
const mockLibraryFindMany = prisma.libraryItem.findMany as ReturnType<typeof vi.fn>;
const mockLibraryCreateMany = prisma.libraryItem.createMany as ReturnType<typeof vi.fn>;

function makeSession(overrides: Partial<{
  id: string; userId: string; status: string;
  createdAt: Date; endedAt: Date | null; interactions: unknown[];
}> = {}) {
  return {
    id: "sess-1",
    userId: "user-1",
    status: "ACTIVE",
    createdAt: new Date("2025-01-01"),
    endedAt: null,
    interactions: [],
    _count: { interactions: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLibraryFindMany.mockResolvedValue([]);
  mockLibraryCreateMany.mockResolvedValue({ count: 0 });
});

describe("startTestSession", () => {
  it("creates a new session when none is active", async () => {
    mockSessionFindFirst.mockResolvedValue(null);
    mockSessionCreate.mockResolvedValue(makeSession());

    const result = await startTestSession("user-1");

    expect(result.id).toBe("sess-1");
    expect(result.status).toBe("ACTIVE");
  });

  it("throws ActiveSessionExistsError when session already active", async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession());

    await expect(startTestSession("user-1")).rejects.toThrow(ActiveSessionExistsError);
  });
});

describe("getActiveSession", () => {
  it("returns session info when active session exists", async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ id: "sess-99" }));

    const result = await getActiveSession("user-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("sess-99");
  });

  it("returns null when no active session", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    const result = await getActiveSession("user-1");

    expect(result).toBeNull();
  });
});

describe("endTestSession", () => {
  it("marks session as ENDED_DISCARDED on discard", async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession({ interactions: [] }));

    await endTestSession("user-1", "discard");

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ENDED_DISCARDED" }),
      }),
    );
  });

  it("marks session as ENDED_KEPT and transfers likes on keep", async () => {
    const interactions = [
      { trackId: "track-1", action: "LIKE" },
      { trackId: "track-2", action: "LIKE" },
    ];
    mockSessionFindFirst.mockResolvedValue(makeSession({ interactions }));
    mockLibraryFindMany.mockResolvedValue([]); // none already liked
    mockLibraryCreateMany.mockResolvedValue({ count: 2 });

    const result = await endTestSession("user-1", "keep");

    expect(result.transferredLikes).toBe(2);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ENDED_KEPT" }),
      }),
    );
  });

  it("does not duplicate already-liked tracks on transfer", async () => {
    const interactions = [{ trackId: "track-1", action: "LIKE" }];
    mockSessionFindFirst.mockResolvedValue(makeSession({ interactions }));
    mockLibraryFindMany.mockResolvedValue([{ trackId: "track-1" }]); // already liked

    const result = await endTestSession("user-1", "keep");

    expect(result.transferredLikes).toBe(0);
    expect(mockLibraryCreateMany).not.toHaveBeenCalled();
  });

  it("throws SessionNotFoundError when no active session", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    await expect(endTestSession("user-1", "keep")).rejects.toThrow(SessionNotFoundError);
  });
});

describe("recordInteraction", () => {
  it("creates interaction in active session", async () => {
    mockSessionFindFirst.mockResolvedValue(makeSession());
    mockInteractionCreate.mockResolvedValue({
      id: "int-1",
      sessionId: "sess-1",
      trackId: "track-1",
      action: "LIKE",
    });

    const result = await recordInteraction("user-1", "track-1", "LIKE");

    expect(result.trackId).toBe("track-1");
    expect(result.action).toBe("LIKE");
  });

  it("throws SessionNotFoundError when no active session", async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    await expect(recordInteraction("user-1", "track-1", "LIKE")).rejects.toThrow(
      SessionNotFoundError,
    );
  });
});
