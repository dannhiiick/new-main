import { prisma } from "../../db/client.js";
import { writeAuditLog } from "../../utils/audit.js";
import { notifyArtistFollowers } from "../../utils/push.js";

const TRACK_INCLUDE = {
  release: { select: { id: true, title: true, coverAssetUrl: true } },
  artists: {
    include: { artist: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: "asc" as const },
  },
} as const;

type TrackRow = {
  id: string;
  title: string;
  durationMs: number;
  playbackStatus: string;
  isPublished: boolean;
  offlineEligible: boolean;
  isLocal: boolean;
  sourcePolicy: string;
  tagStatus: string;
  catalogVisibilityReason: string | null;
  sourceId: string | null;
  lastConfirmedAt: Date | null;
  createdAt: Date;
  release: { id: string; title: string; coverAssetUrl: string | null };
  artists: { artist: { id: string; name: string; slug: string } }[];
};

export interface AdminTrackSummary {
  id: string;
  title: string;
  durationMs: number;
  artists: { id: string; name: string; slug: string }[];
  coverUrl: string | null;
  playbackStatus: string;
  isPublished: boolean;
  offlineEligible: boolean;
  isLocal: boolean;
  sourcePolicy: string;
  tagStatus: string;
  createdAt: string;
  release: { id: string; title: string } | null;
  transparency: {
    visibilityReason: string | null;
    sourceId: string | null;
    lastConfirmedAt: string | null;
  };
}

function toSummary(track: TrackRow): AdminTrackSummary {
  return {
    id: track.id,
    title: track.title,
    durationMs: track.durationMs,
    artists: track.artists.map((ta) => ta.artist),
    coverUrl: track.release.coverAssetUrl,
    playbackStatus: track.playbackStatus,
    isPublished: track.isPublished,
    offlineEligible: track.offlineEligible,
    isLocal: track.isLocal,
    sourcePolicy: track.sourcePolicy,
    tagStatus: track.tagStatus,
    createdAt: track.createdAt.toISOString(),
    release: { id: track.release.id, title: track.release.title },
    transparency: {
      visibilityReason: track.catalogVisibilityReason,
      sourceId: track.sourceId,
      lastConfirmedAt: track.lastConfirmedAt?.toISOString() ?? null,
    },
  };
}

export interface AdminTracksPage {
  tracks: AdminTrackSummary[];
  nextCursor: string | null;
  total: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUserSummary {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  role: string;
  isBanned: boolean;
  preferredLocale: string;
  createdAt: string;
}

export interface AdminUsersPage {
  users: AdminUserSummary[];
  nextCursor: string | null;
  total: number;
}

export async function adminGetUsers(params: {
  q?: string;
  cursor?: string;
  limit: number;
}): Promise<AdminUsersPage> {
  const where =
    params.q != null && params.q.length > 0
      ? {
          OR: [
            { displayName: { contains: params.q, mode: "insensitive" as const } },
            { phone: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit + 1,
      ...(params.cursor != null ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        displayName: true,
        phone: true,
        email: true,
        role: true,
        isBanned: true,
        preferredLocale: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const hasMore = users.length > params.limit;
  const items = hasMore ? users.slice(0, params.limit) : users;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last != null ? last.id : null;

  return {
    users: items.map((u) => ({
      ...u,
      role: u.role === "LISTENER" ? "USER" : (u.role as string),
      preferredLocale: u.preferredLocale as string,
      createdAt: u.createdAt.toISOString(),
    })),
    nextCursor,
    total,
  };
}

// ─── Tracks ───────────────────────────────────────────────────────────────────

export async function adminGetTracks(params: {
  q?: string;
  cursor?: string;
  limit: number;
}): Promise<AdminTracksPage> {
  const where =
    params.q != null && params.q.length > 0
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" as const } },
            {
              artists: {
                some: {
                  artist: {
                    name: { contains: params.q, mode: "insensitive" as const },
                  },
                },
              },
            },
          ],
        }
      : {};

  const [tracks, total] = await Promise.all([
    prisma.track.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit + 1,
      ...(params.cursor != null
        ? { cursor: { id: params.cursor }, skip: 1 }
        : {}),
      include: TRACK_INCLUDE,
    }),
    prisma.track.count({ where }),
  ]);

  const hasMore = tracks.length > params.limit;
  const items = hasMore ? tracks.slice(0, params.limit) : tracks;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last != null ? last.id : null;

  return { tracks: items.map(toSummary), nextCursor, total };
}

export async function adminGetTrackById(id: string): Promise<AdminTrackSummary> {
  const track = await prisma.track.findUniqueOrThrow({
    where: { id },
    include: TRACK_INCLUDE,
  });
  return toSummary(track);
}

export interface AdminTrackPatch {
  isPublished?: boolean;
  playbackStatus?: string;
  title?: string;
  genre?: string | null;
  isLocal?: boolean;
  offlineEligible?: boolean;
  isExplicit?: boolean;
  catalogVisibilityReason?: string | null;
}

export async function adminPatchTrack(
  actorId: string,
  id: string,
  patch: AdminTrackPatch,
  ipAddress?: string,
): Promise<AdminTrackSummary> {
  const before = await prisma.track.findUniqueOrThrow({ where: { id } });

  // Auto-set visibility reason when publishing/unpublishing unless explicitly provided
  const autoVisibilityReason =
    patch.catalogVisibilityReason !== undefined
      ? patch.catalogVisibilityReason
      : patch.isPublished === true
        ? "PUBLISHED"
        : patch.isPublished === false
          ? "UNPUBLISHED_BY_ADMIN"
          : undefined;

  const updated = await prisma.track.update({
    where: { id },
    data: {
      ...(patch.isPublished !== undefined && { isPublished: patch.isPublished }),
      ...(patch.playbackStatus !== undefined && { playbackStatus: patch.playbackStatus as never }),
      ...(autoVisibilityReason !== undefined && { catalogVisibilityReason: autoVisibilityReason }),
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.genre !== undefined && { genre: patch.genre }),
      ...(patch.isLocal !== undefined && { isLocal: patch.isLocal }),
      ...(patch.offlineEligible !== undefined && { offlineEligible: patch.offlineEligible }),
      ...(patch.isExplicit !== undefined && { isExplicit: patch.isExplicit }),
    },
    include: TRACK_INCLUDE,
  });

  await writeAuditLog(prisma, {
    actorId,
    userId: actorId,
    action: "PATCH_TRACK",
    entityType: "Track",
    entityId: id,
    before: {
      isPublished: before.isPublished,
      playbackStatus: before.playbackStatus,
      title: before.title,
      genre: before.genre,
      isLocal: before.isLocal,
    },
    after: {
      isPublished: updated.isPublished,
      playbackStatus: updated.playbackStatus,
      title: updated.title,
      genre: updated.genre,
      isLocal: updated.isLocal,
    },
    ...(ipAddress != null ? { ipAddress } : {}),
  });

  // Fire push notifications when track is newly published
  if (!before.isPublished && updated.isPublished) {
    const primaryArtist = updated.artists[0]?.artist;
    if (primaryArtist) {
      void notifyArtistFollowers(
        primaryArtist.id,
        `Новый трек: ${updated.title}`,
        `${primaryArtist.name} выпустил новое`,
        { trackId: id },
      );
    }
  }

  return toSummary(updated);
}

// ─── Artists ──────────────────────────────────────────────────────────────────

export interface AdminArtistSummary {
  id: string;
  name: string;
  slug: string;
  isLocal: boolean;
  isVerified: boolean;
  isPublished: boolean;
  trackCount: number;
}

export interface AdminArtistsPage {
  artists: AdminArtistSummary[];
  nextCursor: string | null;
  total: number;
}

export async function adminGetArtists(params: {
  q?: string;
  cursor?: string;
  limit: number;
}): Promise<AdminArtistsPage> {
  const where =
    params.q != null && params.q.length > 0
      ? { name: { contains: params.q, mode: "insensitive" as const } }
      : {};

  const [artists, total] = await Promise.all([
    prisma.artist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit + 1,
      ...(params.cursor != null ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { _count: { select: { trackArtists: true } } },
    }),
    prisma.artist.count({ where }),
  ]);

  const hasMore = artists.length > params.limit;
  const items = hasMore ? artists.slice(0, params.limit) : artists;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last != null ? last.id : null;

  return {
    artists: items.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      isLocal: a.isLocal,
      isVerified: a.isVerified,
      isPublished: a.isPublished,
      trackCount: a._count.trackArtists,
    })),
    nextCursor,
    total,
  };
}

// ─── Releases ─────────────────────────────────────────────────────────────────

export interface AdminReleaseSummary {
  id: string;
  title: string;
  slug: string;
  releaseType: string;
  artistName: string;
  coverUrl: string | null;
  isPublished: boolean;
  trackCount: number;
}

export interface AdminReleasesPage {
  releases: AdminReleaseSummary[];
  nextCursor: string | null;
  total: number;
}

export async function adminGetReleases(params: {
  q?: string;
  cursor?: string;
  limit: number;
}): Promise<AdminReleasesPage> {
  const where =
    params.q != null && params.q.length > 0
      ? { title: { contains: params.q, mode: "insensitive" as const } }
      : {};

  const [releases, total] = await Promise.all([
    prisma.release.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.limit + 1,
      ...(params.cursor != null ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        artist: { select: { name: true } },
        _count: { select: { tracks: true } },
      },
    }),
    prisma.release.count({ where }),
  ]);

  const hasMore = releases.length > params.limit;
  const items = hasMore ? releases.slice(0, params.limit) : releases;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last != null ? last.id : null;

  return {
    releases: items.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      releaseType: r.releaseType as string,
      artistName: r.artist.name,
      coverUrl: r.coverAssetUrl,
      isPublished: r.isPublished,
      trackCount: r._count.tracks,
    })),
    nextCursor,
    total,
  };
}

// ─── Bulk operations ──────────────────────────────────────────────────────────

export async function adminBulkArchiveTracks(ids: string[]): Promise<{ count: number }> {
  const result = await prisma.track.updateMany({
    where: { id: { in: ids } },
    data: {
      playbackStatus: "REMOVED",
      isPublished: false,
      catalogVisibilityReason: "admin_archived",
    },
  });
  return { count: result.count };
}

export async function adminBulkSetPublished(ids: string[], isPublished: boolean): Promise<{ count: number }> {
  const result = await prisma.track.updateMany({
    where: { id: { in: ids } },
    data: { isPublished },
  });
  return { count: result.count };
}

export async function adminBulkSetPlayable(ids: string[]): Promise<{ count: number }> {
  const result = await prisma.track.updateMany({
    where: { id: { in: ids } },
    data: { playbackStatus: "PLAYABLE", catalogVisibilityReason: "PUBLISHED" },
  });
  return { count: result.count };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsResult {
  totalPlays: number;
  uniqueTracksPlayed: number;
  topTracks: { trackId: string; title: string; genre: string | null; plays: number }[];
  byGenre: { genre: string; plays: number }[];
  recentDays: { date: string; plays: number }[];
}

export async function adminGetAnalytics(days = 30): Promise<AnalyticsResult> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalPlays, topGrouped, recentRaw] = await Promise.all([
    prisma.playEvent.count({ where: { startedAt: { gte: since }, action: "START" } }),
    prisma.playEvent.groupBy({
      by: ["trackId"],
      where: { startedAt: { gte: since }, action: "START" },
      _count: { _all: true },
      orderBy: { _count: { trackId: "desc" } },
      take: 25,
    }),
    prisma.playEvent.findMany({
      where: { startedAt: { gte: since }, action: "START" },
      select: { startedAt: true },
      orderBy: { startedAt: "asc" },
    }),
  ]);

  const trackIds = topGrouped.map(r => r.trackId);
  const tracks = await prisma.track.findMany({
    where: { id: { in: trackIds } },
    select: { id: true, title: true, genre: true },
  });
  const trackMap = new Map(tracks.map(t => [t.id, t]));

  const dayMap = new Map<string, number>();
  for (const ev of recentRaw) {
    const d = ev.startedAt.toISOString().slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
  }
  const recentDays = Array.from(dayMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .map(([date, plays]) => ({ date, plays }));

  const genreMap = new Map<string, number>();
  for (const r of topGrouped) {
    const t = trackMap.get(r.trackId);
    const genre = t?.genre ?? "Unknown";
    genreMap.set(genre, (genreMap.get(genre) ?? 0) + r._count._all);
  }
  const byGenre = Array.from(genreMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([genre, plays]) => ({ genre, plays }));

  return {
    totalPlays,
    uniqueTracksPlayed: trackIds.length,
    topTracks: topGrouped.map(r => ({
      trackId: r.trackId,
      title: trackMap.get(r.trackId)?.title ?? "Unknown",
      genre: trackMap.get(r.trackId)?.genre ?? null,
      plays: r._count._all,
    })),
    byGenre,
    recentDays,
  };
}

// ─── User management ─────────────────────────────────────────────────────────

export async function adminUpdateUser(
  actorId: string,
  targetId: string,
  data: { role?: "USER" | "CATALOG_MANAGER" | "ADMIN"; isBanned?: boolean },
): Promise<Omit<AdminUserSummary, never>> {
  // Cannot act on yourself for role/ban changes
  if (actorId === targetId && (data.role !== undefined || data.isBanned === true)) {
    throw Object.assign(new Error("Cannot modify your own role or ban yourself"), {
      statusCode: 400,
      code: "SELF_MODIFY_FORBIDDEN",
    });
  }

  // Validate: cannot demote last ADMIN
  if (data.role !== undefined && data.role !== "ADMIN") {
    const target = await prisma.user.findUniqueOrThrow({ where: { id: targetId } });
    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        throw Object.assign(new Error("Cannot demote the last ADMIN"), {
          statusCode: 400,
          code: "LAST_ADMIN",
        });
      }
    }
  }

  // Map role name: "USER" maps to prisma enum "LISTENER"
  const prismaRole =
    data.role === "USER"
      ? ("LISTENER" as const)
      : data.role === "CATALOG_MANAGER"
        ? ("CATALOG_MANAGER" as const)
        : data.role === "ADMIN"
          ? ("ADMIN" as const)
          : undefined;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(prismaRole !== undefined && { role: prismaRole }),
      ...(data.isBanned !== undefined && { isBanned: data.isBanned }),
    },
    select: {
      id: true,
      displayName: true,
      phone: true,
      email: true,
      role: true,
      isBanned: true,
      preferredLocale: true,
      createdAt: true,
    },
  });

  return {
    id: updated.id,
    displayName: updated.displayName,
    phone: updated.phone,
    email: updated.email,
    role: updated.role === "LISTENER" ? "USER" : (updated.role as string),
    isBanned: updated.isBanned,
    preferredLocale: updated.preferredLocale as string,
    createdAt: updated.createdAt.toISOString(),
  };
}

// ─── Artist detail + patch ────────────────────────────────────────────────────

export async function adminGetArtistById(id: string) {
  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { trackArtists: true, followers: true } } },
  });
  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    bio: artist.bio,
    coverUrl: artist.coverUrl,
    isLocal: artist.isLocal,
    isVerified: artist.isVerified,
    isPublished: artist.isPublished,
    type: artist.type as string,
    trackCount: artist._count.trackArtists,
    followerCount: artist._count.followers,
    createdAt: artist.createdAt.toISOString(),
    updatedAt: artist.updatedAt.toISOString(),
  };
}

export async function adminPatchArtist(
  id: string,
  data: {
    name?: string | undefined;
    bio?: string | null | undefined;
    isLocal?: boolean | undefined;
    isVerified?: boolean | undefined;
    isPublished?: boolean | undefined;
  },
) {
  const updated = await prisma.artist.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.isLocal !== undefined ? { isLocal: data.isLocal } : {}),
      ...(data.isVerified !== undefined ? { isVerified: data.isVerified } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    bio: updated.bio,
    coverUrl: updated.coverUrl,
    isLocal: updated.isLocal,
    isVerified: updated.isVerified,
    isPublished: updated.isPublished,
    type: updated.type as string,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

// ─── Release detail + patch ───────────────────────────────────────────────────

export async function adminGetReleaseById(id: string) {
  const release = await prisma.release.findUniqueOrThrow({
    where: { id },
    include: {
      artist: { select: { id: true, name: true, slug: true } },
      tracks: {
        orderBy: { trackNumber: "asc" },
        select: {
          id: true,
          title: true,
          durationMs: true,
          trackNumber: true,
          isPublished: true,
          playbackStatus: true,
          artists: { select: { artist: { select: { name: true } } } },
        },
      },
    },
  });
  return {
    id: release.id,
    title: release.title,
    slug: release.slug,
    releaseType: release.releaseType as string,
    releaseDate: release.releaseDate?.toISOString() ?? null,
    coverUrl: release.coverAssetUrl,
    isPublished: release.isPublished,
    artist: release.artist,
    tracks: release.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      durationMs: t.durationMs,
      trackNumber: t.trackNumber,
      isPublished: t.isPublished,
      playbackStatus: t.playbackStatus as string,
      artists: t.artists.map((ta) => ta.artist.name),
    })),
    createdAt: release.createdAt.toISOString(),
    updatedAt: release.updatedAt.toISOString(),
  };
}

export async function adminPatchRelease(
  id: string,
  data: {
    title?: string | undefined;
    releaseType?: string | undefined;
    releaseDate?: string | null | undefined;
    isPublished?: boolean | undefined;
  },
) {
  const updated = await prisma.release.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.releaseType !== undefined ? { releaseType: data.releaseType as "SINGLE" | "EP" | "ALBUM" | "COMPILATION" | "LIVE" } : {}),
      ...(data.releaseDate !== undefined ? { releaseDate: data.releaseDate ? new Date(data.releaseDate) : null } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
    },
    include: { artist: { select: { name: true } } },
  });
  return {
    id: updated.id,
    title: updated.title,
    slug: updated.slug,
    releaseType: updated.releaseType as string,
    releaseDate: updated.releaseDate?.toISOString() ?? null,
    coverUrl: updated.coverAssetUrl,
    isPublished: updated.isPublished,
    artistName: updated.artist.name,
    updatedAt: updated.updatedAt.toISOString(),
  };
}
