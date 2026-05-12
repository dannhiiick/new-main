export interface TrackSummary {
  id: string;
  title: string;
  durationMs: number;
  artists: { id: string; name: string; slug: string }[];
  coverUrl: string | null;
  playbackStatus: 'PLAYABLE' | 'PROCESSING' | 'BLOCKED';
  offlineEligible: boolean;
  isLocal: boolean;
  isExplicit: boolean;
}

export interface TrackDetails extends TrackSummary {
  releaseId: string;
  releaseTitle: string;
  genreIds: string[];
  tags: string[];
  lyricsUrl: string | null;
}

export interface HomeSection {
  id: string;
  title: string;
  items: TrackSummary[];
}

export interface HomeResponse {
  sections: HomeSection[];
}

export interface SearchResponse {
  tracks: TrackSummary[];
  releases: ReleaseItem[];
  artists: ArtistItem[];
}

export interface ReleaseItem {
  id: string;
  title: string;
  coverUrl: string | null;
  artists: { id: string; name: string; slug: string }[];
}

export interface ArtistItem {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
}

export interface LibraryLikedResponse {
  items: TrackSummary[];
  nextCursor: string | null;
}

export interface AuthUser {
  id: string;
  displayName: string;
  role: string;
  preferredLocale: string;
}

export interface OtpRequestResponse {
  challengeId: string;
  expiresAt: string;
}

export interface OtpVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LikedStatusResponse {
  liked: boolean;
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

export interface RecommendationsResponse {
  items: TrackSummary[];
}

export type FeedbackKind = 'HIDE_TRACK' | 'HIDE_ARTIST';

export interface ChartEntryItem {
  position: number;
  prevPos: number | null;
  peakPos: number | null;
  weeksOn: number;
  track: TrackSummary;
}

export interface ChartResponse {
  slug: string;
  title: string;
  territory: string;
  updatedAt: string;
  entries: ChartEntryItem[];
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface LyricsResponse {
  synced: boolean;
  lines: LyricLine[];
  plainText: string | null;
  source: 'lrclib' | 'cache' | 'none';
}

export interface FeedItem {
  type: 'NEW_RELEASE' | 'FRIEND_LIKE';
  id: string;
  createdAt: string;
  artist?: { id: string; name: string; slug: string; isLocal: boolean };
  release?: {
    id: string;
    title: string;
    coverUrl: string | null;
    releaseType: string;
    releaseDate: string | null;
  };
  friend?: { id: string; displayName: string; avatarUrl: string | null };
  track?: { id: string; title: string; durationMs: number };
}

export interface SocialFeedResponse {
  items: FeedItem[];
  totalFollowedArtists: number;
}

export interface BridgeTrack {
  track: TrackSummary;
  fromScore: number;
  toScore: number;
  bridgeScore: number;
}

export interface GenreBridgeResponse {
  fromGenre: string;
  toGenre: string;
  tracks: BridgeTrack[];
  suggestion: string;
}

export interface BridgeSuggestionResponse {
  fromGenre: string | null;
  toGenre: string | null;
}

export interface GenreNode {
  genre: string;
  playCount: number;
  likeCount: number;
  weight: number;
  affinityScore: number;
  isLocal: boolean;
}

export interface TasteMapResponse {
  genres: GenreNode[];
  totalPlays: number;
  topGenre: string | null;
  updatedAt: string;
}

export interface UndergroundTrackItem {
  id: string;
  title: string;
  durationMs: number;
  playCount: number;
  score: number;
  release: { id: string; title: string; coverUrl: string | null };
  artist: { id: string; name: string; isLocal: boolean };
}

export interface UndergroundResponse {
  items: UndergroundTrackItem[];
  nextCursor: string | null;
}

export interface PlaylistListItem {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  _count: { tracks: number };
}

export interface PlaylistListPage {
  items: PlaylistListItem[];
  nextCursor: string | null;
}

export interface PlaylistTrackItem {
  id: string;
  trackId: string;
  position: number;
  track: {
    id: string;
    title: string;
    duration: number;
    artists: { artist: { id: string; name: string } }[];
  };
}

export interface PlaylistDetail {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  tracks: PlaylistTrackItem[];
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

export interface TestSession {
  id: string;
  startedAt: string;
  interactionCount: number;
  likedCount: number;
}

export interface TestSessionEnded {
  transferred: number;
  discarded: number;
}
