import { prisma } from "../../db/client.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FriendInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedItem {
  type: "NEW_RELEASE" | "FRIEND_LIKE";
  id: string;
  createdAt: Date;
  artist?: { id: string; name: string; slug: string; isLocal: boolean };
  release?: {
    id: string;
    title: string;
    coverUrl: string | null;
    releaseType: string;
    releaseDate: Date | null;
  };
  friend?: FriendInfo;
  track?: { id: string; title: string; durationMs: number };
}

export class FriendNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "FriendNotFoundError";
  }
}

export class AlreadyFriendsError extends Error {
  constructor() {
    super("Already friends or request pending");
    this.name = "AlreadyFriendsError";
  }
}

// ── Artist follows ─────────────────────────────────────────────────────────

export async function followArtist(userId: string, artistId: string): Promise<void> {
  await prisma.artistFollow.upsert({
    where: { userId_artistId: { userId, artistId } },
    create: { userId, artistId },
    update: {},
  });
}

export async function unfollowArtist(userId: string, artistId: string): Promise<void> {
  await prisma.artistFollow.deleteMany({ where: { userId, artistId } });
}

export async function getFollowedArtists(userId: string): Promise<{ id: string; name: string; slug: string }[]> {
  const follows = await prisma.artistFollow.findMany({
    where: { userId },
    include: { artist: { select: { id: true, name: true, slug: true } } },
  });
  return follows.map((f) => f.artist);
}

// ── Friendship ────────────────────────────────────────────────────────────

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  if (requesterId === addresseeId) throw new FriendNotFoundError();

  const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
  if (!addressee) throw new FriendNotFoundError();

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });
  if (existing) throw new AlreadyFriendsError();

  await prisma.friendship.create({ data: { requesterId, addresseeId } });
}

export async function acceptFriendRequest(userId: string, requesterId: string): Promise<void> {
  await prisma.friendship.updateMany({
    where: { requesterId, addresseeId: userId, status: "PENDING" },
    data: { status: "ACCEPTED" },
  });
}

export async function getFriends(userId: string): Promise<FriendInfo[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, status: "ACCEPTED" },
        { addresseeId: userId, status: "ACCEPTED" },
      ],
    },
    include: {
      requester: { select: { id: true, displayName: true, avatarUrl: true } },
      addressee: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  return friendships.map((f) =>
    f.requesterId === userId ? f.addressee : f.requester,
  );
}

// ── Social feed ───────────────────────────────────────────────────────────

/**
 * Returns a feed of:
 * 1. New releases from followed artists (last 90 days)
 * 2. Friend likes (last 7 days) — Phase 2
 */
export async function getSocialFeed(
  userId: string,
  limit = 20,
): Promise<{ items: FeedItem[]; totalFollowedArtists: number }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const followedArtists = await prisma.artistFollow.findMany({
    where: { userId },
    select: { artistId: true },
  });

  const artistIds = followedArtists.map((f) => f.artistId);

  const feedItems: FeedItem[] = [];

  if (artistIds.length > 0) {
    // New releases from followed artists
    const releases = await prisma.release.findMany({
      where: {
        artistId: { in: artistIds },
        isPublished: true,
        createdAt: { gte: ninetyDaysAgo },
      },
      include: {
        artist: { select: { id: true, name: true, slug: true, isLocal: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    for (const r of releases) {
      feedItems.push({
        type: "NEW_RELEASE",
        id: `release-${r.id}`,
        createdAt: r.createdAt,
        artist: r.artist,
        release: {
          id: r.id,
          title: r.title,
          coverUrl: r.coverAssetUrl,
          releaseType: r.releaseType,
          releaseDate: r.releaseDate,
        },
      });
    }
  }

  // Sort by date desc
  feedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    items: feedItems.slice(0, limit),
    totalFollowedArtists: artistIds.length,
  };
}
