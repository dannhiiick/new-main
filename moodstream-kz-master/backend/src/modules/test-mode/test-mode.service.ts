import { prisma } from "../../db/client.js";
import type { TrackSummary } from "../catalog/catalog.service.js";

export class ActiveSessionExistsError extends Error {
  constructor() {
    super("A test session is already active");
    this.name = "ActiveSessionExistsError";
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("No active test session found");
    this.name = "SessionNotFoundError";
  }
}

export interface TestSessionInfo {
  id: string;
  status: string;
  createdAt: Date;
  interactionCount: number;
}

export interface TestInteractionResult {
  sessionId: string;
  trackId: string;
  action: string;
}

// ── Session management ─────────────────────────────────────────────────────

export async function startTestSession(userId: string): Promise<TestSessionInfo> {
  const existing = await prisma.testSession.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (existing != null) throw new ActiveSessionExistsError();

  const session = await prisma.testSession.create({
    data: { userId },
    include: { _count: { select: { interactions: true } } },
  });

  return {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    interactionCount: 0,
  };
}

export async function getActiveSession(userId: string): Promise<TestSessionInfo | null> {
  const session = await prisma.testSession.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { _count: { select: { interactions: true } } },
  });
  if (session == null) return null;

  return {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
    interactionCount: session._count.interactions,
  };
}

export async function endTestSession(
  userId: string,
  action: "keep" | "discard",
): Promise<{ transferredLikes: number }> {
  const session = await prisma.testSession.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      interactions: {
        where: { action: "LIKE" },
        select: { trackId: true },
      },
    },
  });
  if (session == null) throw new SessionNotFoundError();

  let transferredLikes = 0;

  if (action === "keep" && session.interactions.length > 0) {
    // Transfer liked tracks to the user's real library (deduplicate)
    const existingLiked = await prisma.libraryItem.findMany({
      where: {
        userId,
        entityType: "TRACK",
        trackId: { in: session.interactions.map((i) => i.trackId) },
        removedAt: null,
      },
      select: { trackId: true },
    });
    const alreadyLikedIds = new Set(existingLiked.map((i) => i.trackId));

    const toAdd = session.interactions
      .map((i: { trackId: string }) => i.trackId)
      .filter((id: string) => !alreadyLikedIds.has(id));

    if (toAdd.length > 0) {
      await prisma.libraryItem.createMany({
        data: toAdd.map((trackId: string) => ({
          userId,
          entityType: "TRACK" as const,
          trackId,
        })),
        skipDuplicates: true,
      });
      transferredLikes = toAdd.length;
    }
  }

  await prisma.testSession.update({
    where: { id: session.id },
    data: {
      status: action === "keep" ? "ENDED_KEPT" : "ENDED_DISCARDED",
      endedAt: new Date(),
    },
  });

  return { transferredLikes };
}

// ── Interaction recording ──────────────────────────────────────────────────

export async function recordInteraction(
  userId: string,
  trackId: string,
  action: "LIKE" | "SKIP" | "PLAY" | "UNLIKE",
): Promise<TestInteractionResult> {
  const session = await prisma.testSession.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (session == null) throw new SessionNotFoundError();

  const interaction = await prisma.testInteraction.create({
    data: { sessionId: session.id, trackId, action },
  });

  return {
    sessionId: session.id,
    trackId: interaction.trackId,
    action: interaction.action,
  };
}

// ── Session tracks (liked in test session) ────────────────────────────────

export interface TestSessionTrack {
  trackId: string;
  action: string;
  createdAt: Date;
  track: TrackSummary;
}

export async function getSessionLikedTracks(userId: string): Promise<TestSessionTrack[]> {
  const session = await prisma.testSession.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  if (session == null) return [];

  const interactions = await prisma.testInteraction.findMany({
    where: { sessionId: session.id, action: "LIKE" },
    include: {
      track: {
        include: {
          release: { select: { coverAssetUrl: true } },
          artists: {
            include: { artist: { select: { id: true, name: true, slug: true } } },
            orderBy: { order: "asc" as const },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return interactions.map((i: typeof interactions[number]) => ({
    trackId: i.trackId,
    action: i.action,
    createdAt: i.createdAt,
    track: {
      id: i.track.id,
      title: i.track.title,
      durationMs: i.track.durationMs,
      artists: i.track.artists.map((ta: typeof interactions[number]['track']['artists'][number]) => ({
        id: ta.artist.id,
        name: ta.artist.name,
        slug: ta.artist.slug,
      })),
      coverUrl: i.track.release.coverAssetUrl,
      playbackStatus: i.track.playbackStatus as "PLAYABLE" | "PROCESSING" | "BLOCKED",
      offlineEligible: i.track.offlineEligible,
      isLocal: i.track.isLocal,
    },
  }));
}
