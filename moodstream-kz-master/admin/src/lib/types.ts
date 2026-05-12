export interface TrackSummary {
  id: string
  title: string
  durationMs: number
  artists: { id: string; name: string; slug: string }[]
  coverUrl: string | null
  playbackStatus: 'PLAYABLE' | 'PROCESSING' | 'BLOCKED' | 'REMOVED'
  offlineEligible: boolean
  isLocal: boolean
  isPublished: boolean
  sourcePolicy: string
  tagStatus: string
  genre?: string | null
}

export interface ArtistSummary {
  id: string
  name: string
  slug: string
  isLocal: boolean
  isVerified: boolean
  isPublished: boolean
}

export interface ReleaseSummary {
  id: string
  title: string
  slug: string
  releaseType: string
  artists: ArtistSummary[]
  coverUrl: string | null
  isPublished: boolean
}

export interface AdminUser {
  id: string
  displayName: string
  role: string
}

export interface TrackDetails extends TrackSummary {
  createdAt?: string
  release?: ReleaseSummary | null
  transparency: {
    visibilityReason: string | null
    lastConfirmedAt: string | null
    sourceId: string | null
  }
  availability?: {
    territories: { code: string; status: string }[]
  }
}

export interface AdminArtistSummary {
  id: string
  name: string
  slug: string
  isLocal: boolean
  isVerified: boolean
  isPublished: boolean
  trackCount: number
}

export interface AdminArtistsPage {
  artists: AdminArtistSummary[]
  nextCursor: string | null
  total: number
}

export interface AdminReleaseSummary {
  id: string
  title: string
  slug: string
  releaseType: string
  artistName: string
  coverUrl: string | null
  isPublished: boolean
  trackCount: number
}

export interface AdminReleasesPage {
  releases: AdminReleaseSummary[]
  nextCursor: string | null
  total: number
}

export interface AdminUserSummary {
  id: string
  displayName: string
  phone: string | null
  email: string | null
  role: string
  preferredLocale: string
  createdAt: string
  isBanned: boolean
}

export interface AdminUsersPage {
  users: AdminUserSummary[]
  nextCursor: string | null
  total: number
}

export interface OtpRequestResponse {
  challengeId: string
  expiresAt: string
}

export interface OtpVerifyResponse {
  accessToken: string
  user: AdminUser
}

export interface SearchResponse {
  tracks: TrackSummary[]
  releases: ReleaseSummary[]
  artists: ArtistSummary[]
  nextCursor?: string | null
}

export interface HomeResponse {
  sections: unknown[]
}

export interface FeedbackItem {
  id: string
  category: string
  message: string
  appVersion: string | null
  platform: string | null
  status: string
  createdAt: string
  user: { id: string; displayName: string; email: string | null } | null
}

export interface FeedbackPage {
  items: FeedbackItem[]
  nextCursor: string | null
  total: number
}

export interface AnalyticsResult {
  totalPlays: number
  uniqueTracksPlayed: number
  topTracks: { trackId: string; title: string; genre: string | null; plays: number }[]
  byGenre: { genre: string; plays: number }[]
  recentDays: { date: string; plays: number }[]
}
