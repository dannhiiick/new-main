import { prisma } from "../../db/client.js";
import type { LocaleCode, TerritoryCode, CursorPage } from "../../domain/types.js";

export interface TrackSummary {
  id: string;
  title: string;
  durationMs: number;
  artists: { id: string; name: string; slug: string }[];
  coverUrl: string | null;
  playbackStatus: "PLAYABLE" | "PROCESSING" | "BLOCKED";
  offlineEligible: boolean;
  isLocal: boolean;
}

export interface HomeSection {
  id: string;
  title: string;
  items: TrackSummary[];
}

export interface HomeResponse {
  sections: HomeSection[];
}

// Base filter: only published + playable tracks surface to consumers
const PUBLISHED_PLAYABLE = {
  isPublished: true,
  playbackStatus: "PLAYABLE" as const,
};

const TRACK_INCLUDE = {
  release: { select: { coverAssetUrl: true } },
  artists: {
    include: { artist: { select: { id: true, name: true, slug: true } } },
    orderBy: { order: "asc" as const },
  },
} as const;

// Derive the Prisma result type for tracks with the standard include
type TrackWithStandardInclude = {
  id: string;
  title: string;
  durationMs: number;
  playbackStatus: string;
  offlineEligible: boolean;
  isLocal: boolean;
  release: { coverAssetUrl: string | null };
  artists: {
    artist: { id: string; name: string; slug: string };
  }[];
};

function buildTrackSummary(track: TrackWithStandardInclude): TrackSummary {
  const status = track.playbackStatus as "PLAYABLE" | "PROCESSING" | "BLOCKED";
  return {
    id: track.id,
    title: track.title,
    durationMs: track.durationMs,
    artists: track.artists.map((ta) => ({
      id: ta.artist.id,
      name: ta.artist.name,
      slug: ta.artist.slug,
    })),
    coverUrl: track.release.coverAssetUrl,
    playbackStatus: status,
    offlineEligible: track.offlineEligible,
    isLocal: track.isLocal,
  };
}

/** Section title localisation — keys match mobile i18n */
const SECTION_TITLES: Record<string, Record<LocaleCode, string>> = {
  "new-kz": { kk: "Қазақстан жаңалықтары", ru: "Новинки Казахстана", en: "New from Kazakhstan" },
  "popular": { kk: "Танымал", ru: "Популярное", en: "Popular" },
  "kazakh-music": { kk: "Қазақ музыкасы", ru: "Казахстанская музыка", en: "Kazakh Music" },
};

function sectionTitle(id: string, locale: LocaleCode): string {
  return SECTION_TITLES[id]?.[locale] ?? SECTION_TITLES[id]?.["ru"] ?? id;
}

export async function getHomeSections(
  locale: LocaleCode,
  _territory: TerritoryCode,
): Promise<HomeResponse> {
  const [newKazakh, popular, kazakhMusic] = await Promise.all([
    // "Новинки Казахстана" — local tracks ordered by creation date
    prisma.track.findMany({
      where: { ...PUBLISHED_PLAYABLE, isLocal: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: TRACK_INCLUDE,
    }),

    // "Популярное" — most played (by play events count)
    prisma.track.findMany({
      where: PUBLISHED_PLAYABLE,
      orderBy: { playEvents: { _count: "desc" } },
      take: 20,
      include: TRACK_INCLUDE,
    }),

    // "Казахстанская музыка" — local tracks with most play events (featured KZ section)
    prisma.track.findMany({
      where: { ...PUBLISHED_PLAYABLE, isLocal: true },
      orderBy: { playEvents: { _count: "desc" } },
      take: 20,
      include: TRACK_INCLUDE,
    }),
  ]);

  const sections = [
    {
      id: "new-kz",
      title: sectionTitle("new-kz", locale),
      items: newKazakh.map(buildTrackSummary),
    },
    {
      id: "popular",
      title: sectionTitle("popular", locale),
      items: popular.map(buildTrackSummary),
    },
  ];

  // Only include KZ Music section if it has tracks distinct from new-kz
  if (kazakhMusic.length > 0) {
    const newKzIds = new Set(newKazakh.map((t) => t.id));
    const distinctKzMusic = kazakhMusic.filter((t) => !newKzIds.has(t.id));
    if (distinctKzMusic.length > 0) {
      sections.push({
        id: "kazakh-music",
        title: sectionTitle("kazakh-music", locale),
        items: distinctKzMusic.map(buildTrackSummary),
      });
    }
  }

  return { sections };
}

// ─── Transliteration helpers ──────────────────────────────────────────────────

// Cyrillic → Latin mapping (covers ru/kk common chars)
const CYR_TO_LAT: [RegExp, string][] = [
  [/а/gi, "a"], [/б/gi, "b"], [/в/gi, "v"], [/г/gi, "g"], [/д/gi, "d"],
  [/е/gi, "e"], [/ё/gi, "yo"], [/ж/gi, "zh"], [/з/gi, "z"], [/и/gi, "i"],
  [/й/gi, "y"], [/к/gi, "k"], [/л/gi, "l"], [/м/gi, "m"], [/н/gi, "n"],
  [/о/gi, "o"], [/п/gi, "p"], [/р/gi, "r"], [/с/gi, "s"], [/т/gi, "t"],
  [/у/gi, "u"], [/ф/gi, "f"], [/х/gi, "kh"], [/ц/gi, "ts"], [/ч/gi, "ch"],
  [/ш/gi, "sh"], [/щ/gi, "sch"], [/ъ/gi, ""], [/ы/gi, "y"], [/ь/gi, ""],
  [/э/gi, "e"], [/ю/gi, "yu"], [/я/gi, "ya"],
  // Kazakh-specific
  [/ә/gi, "a"], [/ғ/gi, "g"], [/қ/gi, "k"], [/ң/gi, "n"], [/ө/gi, "o"],
  [/ұ/gi, "u"], [/ү/gi, "u"], [/һ/gi, "h"], [/і/gi, "i"],
];

// Latin → Cyrillic mapping (common reverse transliteration)
const LAT_TO_CYR: [RegExp, string][] = [
  [/zh/gi, "ж"], [/kh/gi, "х"], [/ts/gi, "ц"], [/ch/gi, "ч"],
  [/sh/gi, "ш"], [/sch/gi, "щ"], [/yu/gi, "ю"], [/ya/gi, "я"],
  [/yo/gi, "ё"],
  [/a/gi, "а"], [/b/gi, "б"], [/v/gi, "в"], [/g/gi, "г"], [/d/gi, "д"],
  [/e/gi, "е"], [/z/gi, "з"], [/i/gi, "и"], [/y/gi, "й"], [/k/gi, "к"],
  [/l/gi, "л"], [/m/gi, "м"], [/n/gi, "н"], [/o/gi, "о"], [/p/gi, "п"],
  [/r/gi, "р"], [/s/gi, "с"], [/t/gi, "т"], [/u/gi, "у"], [/f/gi, "ф"],
];

function transliterate(str: string, map: [RegExp, string][]): string {
  let result = str;
  for (const [re, replacement] of map) {
    result = result.replace(re, replacement);
  }
  return result;
}

/** Returns an array of search variants: original + transliterated forms */
function searchVariants(q: string): string[] {
  const variants = new Set<string>([q]);
  const cyrToLat = transliterate(q, CYR_TO_LAT);
  const latToCyr = transliterate(q, LAT_TO_CYR);
  if (cyrToLat !== q) variants.add(cyrToLat);
  if (latToCyr !== q) variants.add(latToCyr);
  return [...variants];
}

export async function searchTracks(
  query: string,
  _locale: LocaleCode,
  _territory: TerritoryCode,
  cursor: string | undefined,
  limit: number,
): Promise<CursorPage<TrackSummary>> {
  const q = query.trim();
  const variants = searchVariants(q);

  // Build OR conditions for all transliteration variants
  const titleConditions = variants.map((v) => ({
    title: { contains: v, mode: "insensitive" as const },
  }));
  const artistConditions = variants.map((v) => ({
    artists: {
      some: {
        artist: { name: { contains: v, mode: "insensitive" as const } },
      },
    },
  }));

  const tracks = await prisma.track.findMany({
    where: {
      ...PUBLISHED_PLAYABLE,
      OR: [...titleConditions, ...artistConditions],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor != null ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: TRACK_INCLUDE,
  });

  const hasMore = tracks.length > limit;
  const items = hasMore ? tracks.slice(0, limit) : tracks;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem != null ? lastItem.id : null;

  return {
    items: items.map(buildTrackSummary),
    nextCursor,
  };
}

export interface TrackDetail extends TrackSummary {
  isExplicit: boolean;
  audioFormat: string | null;
  audioBitrate: number | null;
  release: {
    id: string;
    title: string;
    slug: string;
    releaseType: string;
    releaseDate: string | null;
  };
  transparency: {
    visibilityReason: string | null;
    lastConfirmedAt: string | null;
  };
}

export async function getTrackById(id: string): Promise<TrackDetail> {
  const track = await prisma.track.findUniqueOrThrow({
    where: { id, ...PUBLISHED_PLAYABLE },
    include: {
      release: {
        select: {
          id: true,
          title: true,
          slug: true,
          releaseType: true,
          releaseDate: true,
          coverAssetUrl: true,
          catalogVisibilityReason: true,
        },
      },
      artists: {
        include: { artist: { select: { id: true, name: true, slug: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  const status = track.playbackStatus as "PLAYABLE" | "PROCESSING" | "BLOCKED";

  return {
    id: track.id,
    title: track.title,
    durationMs: track.durationMs,
    artists: track.artists.map((ta) => ({
      id: ta.artist.id,
      name: ta.artist.name,
      slug: ta.artist.slug,
    })),
    coverUrl: track.release.coverAssetUrl,
    playbackStatus: status,
    offlineEligible: track.offlineEligible,
    isLocal: track.isLocal,
    isExplicit: track.isExplicit,
    audioFormat: track.audioFormat,
    audioBitrate: track.audioBitrate,
    release: {
      id: track.release.id,
      title: track.release.title,
      slug: track.release.slug,
      releaseType: track.release.releaseType,
      releaseDate: track.release.releaseDate?.toISOString() ?? null,
    },
    transparency: {
      visibilityReason: track.catalogVisibilityReason,
      lastConfirmedAt: track.lastConfirmedAt?.toISOString() ?? null,
    },
  };
}

export interface ArtistDetail {
  id: string;
  slug: string;
  name: string;
  type: string;
  bio: string | null;
  coverUrl: string | null;
  isLocal: boolean;
  isVerified: boolean;
  followerCount: number;
  releases: {
    id: string;
    slug: string;
    title: string;
    releaseType: string;
    releaseDate: string | null;
    coverAssetUrl: string | null;
  }[];
}

export async function getArtistById(id: string): Promise<ArtistDetail> {
  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id, isPublished: true },
    include: {
      releases: {
        where: { isPublished: true },
        orderBy: { releaseDate: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          releaseType: true,
          releaseDate: true,
          coverAssetUrl: true,
        },
      },
      _count: { select: { followers: true } },
    },
  });

  return {
    id: artist.id,
    slug: artist.slug,
    name: artist.name,
    type: artist.type,
    bio: artist.bio,
    coverUrl: artist.coverUrl,
    isLocal: artist.isLocal,
    isVerified: artist.isVerified,
    followerCount: artist._count.followers,
    releases: artist.releases.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      releaseType: r.releaseType,
      releaseDate: r.releaseDate?.toISOString() ?? null,
      coverAssetUrl: r.coverAssetUrl,
    })),
  };
}

export interface ReleaseDetail {
  id: string;
  slug: string;
  title: string;
  releaseType: string;
  releaseDate: string | null;
  coverAssetUrl: string | null;
  artist: { id: string; name: string; slug: string };
  tracks: TrackSummary[];
}

export async function getReleaseById(id: string): Promise<ReleaseDetail> {
  const release = await prisma.release.findUniqueOrThrow({
    where: { id, isPublished: true },
    include: {
      artist: { select: { id: true, name: true, slug: true } },
      tracks: {
        where: PUBLISHED_PLAYABLE,
        orderBy: { trackNumber: "asc" },
        include: {
          release: { select: { coverAssetUrl: true } },
          artists: {
            include: { artist: { select: { id: true, name: true, slug: true } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  return {
    id: release.id,
    slug: release.slug,
    title: release.title,
    releaseType: release.releaseType,
    releaseDate: release.releaseDate?.toISOString() ?? null,
    coverAssetUrl: release.coverAssetUrl,
    artist: release.artist,
    tracks: release.tracks.map(buildTrackSummary),
  };
}

export interface ArtistStats {
  totalReleases: number;
  totalTracks: number;
  totalPlays: number;
  createdAt: string;
  topTracks: (TrackSummary & { playCount: number })[];
  releases: {
    id: string;
    title: string;
    releaseType: string;
    releaseDate: string | null;
    coverAssetUrl: string | null;
    tracks: TrackSummary[];
  }[];
}

export async function getArtistStats(artistId: string): Promise<ArtistStats> {
  const artist = await prisma.artist.findUniqueOrThrow({
    where: { id: artistId, isPublished: true },
    select: {
      createdAt: true,
      releases: {
        where: { isPublished: true },
        orderBy: { releaseDate: "desc" },
        select: {
          id: true,
          title: true,
          releaseType: true,
          releaseDate: true,
          coverAssetUrl: true,
          tracks: {
            where: PUBLISHED_PLAYABLE,
            orderBy: { trackNumber: "asc" },
            include: {
              release: { select: { coverAssetUrl: true } },
              artists: {
                include: { artist: { select: { id: true, name: true, slug: true } } },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const allTracks = artist.releases.flatMap(r => r.tracks);
  const totalTracks = allTracks.length;

  // Aggregate play counts per track
  const playCounts = await prisma.playEvent.groupBy({
    by: ["trackId"],
    where: {
      trackId: { in: allTracks.map(t => t.id) },
      suspicious: false,
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 3,
  });

  const totalPlays = await prisma.playEvent.count({
    where: {
      trackId: { in: allTracks.map(t => t.id) },
      suspicious: false,
    },
  });

  const topTrackMap = new Map(playCounts.map(p => [p.trackId, p._count.id]));
  const topTracks = playCounts
    .map(p => {
      const track = allTracks.find(t => t.id === p.trackId);
      if (!track) return null;
      return { ...buildTrackSummary(track), playCount: topTrackMap.get(p.trackId) ?? 0 };
    })
    .filter((t): t is (TrackSummary & { playCount: number }) => t !== null);

  return {
    totalReleases: artist.releases.length,
    totalTracks,
    totalPlays,
    createdAt: artist.createdAt.toISOString(),
    topTracks,
    releases: artist.releases.map(r => ({
      id: r.id,
      title: r.title,
      releaseType: r.releaseType,
      releaseDate: r.releaseDate?.toISOString() ?? null,
      coverAssetUrl: r.coverAssetUrl,
      tracks: r.tracks.map(buildTrackSummary),
    })),
  };
}
