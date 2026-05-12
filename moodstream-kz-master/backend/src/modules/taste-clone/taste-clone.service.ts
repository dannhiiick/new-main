import { prisma } from "../../db/client.js";
import { getRecommendations } from "../recommendations/recommendations.service.js";
import type { RecommendationsResult } from "../recommendations/recommendations.service.js";

export class ProfileNotFoundError extends Error {
  constructor() {
    super("Public profile not found");
    this.name = "ProfileNotFoundError";
  }
}

export class ProfilePrivateError extends Error {
  constructor() {
    super("This profile is private");
    this.name = "ProfilePrivateError";
  }
}

export class CloneSessionExistsError extends Error {
  constructor() {
    super("A clone session is already active");
    this.name = "CloneSessionExistsError";
  }
}

// ── Public profile management ──────────────────────────────────────────────

export async function upsertPublicProfile(
  userId: string,
  data: { displayName?: string | undefined; bio?: string | undefined; isPublic?: boolean | undefined },
): Promise<{ id: string; displayName: string; bio: string | null; isPublic: boolean; genreTags: string[] }> {
  // Compute genre tags from recent play history
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const plays = await prisma.playEvent.findMany({
    where: { userId, startedAt: { gte: thirtyDaysAgo }, suspicious: false },
    include: { track: { select: { genre: true } } },
    take: 500,
  });

  const genreCount = new Map<string, number>();
  for (const p of plays) {
    const g = p.track.genre;
    if (g) genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
  }
  const genreTags = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });

  const profile = await prisma.publicProfile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: data.displayName ?? user?.displayName ?? "Unknown",
      bio: data.bio ?? null,
      isPublic: data.isPublic ?? false,
      genreTags,
    },
    update: {
      ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      genreTags,
    },
  });

  return profile;
}

export async function listPublicProfiles(limit = 20): Promise<{
  id: string;
  displayName: string;
  bio: string | null;
  genreTags: string[];
}[]> {
  return prisma.publicProfile.findMany({
    where: { isPublic: true },
    select: { id: true, displayName: true, bio: true, genreTags: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

// ── Clone session management ────────────────────────────────────────────────

export async function startCloneSession(
  clonerUserId: string,
  sourceProfileId: string,
): Promise<{ id: string; sourceProfileId: string; startedAt: Date }> {
  const profile = await prisma.publicProfile.findUnique({ where: { id: sourceProfileId } });
  if (!profile) throw new ProfileNotFoundError();
  if (!profile.isPublic) throw new ProfilePrivateError();

  const existing = await prisma.cloneSession.findFirst({
    where: { clonerUserId, isActive: true },
  });
  if (existing) throw new CloneSessionExistsError();

  const session = await prisma.cloneSession.create({
    data: { clonerUserId, sourceProfileId },
  });

  return { id: session.id, sourceProfileId, startedAt: session.startedAt };
}

export async function endCloneSession(clonerUserId: string): Promise<void> {
  await prisma.cloneSession.updateMany({
    where: { clonerUserId, isActive: true },
    data: { isActive: false, endedAt: new Date() },
  });
}

export async function getActiveCloneSession(clonerUserId: string): Promise<{
  id: string;
  sourceProfile: { id: string; displayName: string; genreTags: string[] };
  startedAt: Date;
} | null> {
  const session = await prisma.cloneSession.findFirst({
    where: { clonerUserId, isActive: true },
    include: {
      sourceProfile: { select: { id: true, displayName: true, genreTags: true } },
    },
  });
  if (!session) return null;
  return {
    id: session.id,
    sourceProfile: session.sourceProfile,
    startedAt: session.startedAt,
  };
}

/**
 * Get recommendations blended from both the cloner's and source's listening history.
 * 70% source taste + 30% own taste.
 */
export async function getCloneRecommendations(
  clonerUserId: string,
  limit = 20,
): Promise<RecommendationsResult> {
  const session = await getActiveCloneSession(clonerUserId);

  if (!session) {
    return getRecommendations(clonerUserId, limit);
  }

  // Get source profile userId
  const sourceProfile = await prisma.publicProfile.findUnique({
    where: { id: session.sourceProfile.id },
    select: { userId: true },
  });

  if (!sourceProfile) return getRecommendations(clonerUserId, limit);

  const sourceUserId = sourceProfile.userId;

  // Blend: 70% source + 30% own
  const sourceCount = Math.ceil(limit * 0.7);
  const ownCount = Math.ceil(limit * 0.3);

  const [sourceRecs, ownRecs] = await Promise.all([
    getRecommendations(sourceUserId, sourceCount),
    getRecommendations(clonerUserId, ownCount),
  ]);

  // Merge, deduplicate by trackId
  const seen = new Set<string>();
  const merged = [...sourceRecs.tracks, ...ownRecs.tracks].filter((t) => {
    if (seen.has(t.trackId)) return false;
    seen.add(t.trackId);
    return true;
  });

  return {
    tracks: merged.slice(0, limit),
    profile: ownRecs.profile,
  };
}
