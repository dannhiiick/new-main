import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '../../components/track/TrackRow';
import { useColors } from '../../hooks/useColors';
import { apiGet, apiPost } from '../../lib/api';
import type { BridgeSuggestionResponse, ChartResponse, FeedbackKind, GenreBridgeResponse, HomeResponse, HomeSection, RecommendationsResponse, TrackSummary, UndergroundResponse, UndergroundTrackItem } from '../../lib/types';
import { useAuthStore } from '../../store/auth';
import { usePlayerStore } from '../../store/player';
import { useRecentlyPlayedStore } from '../../store/recentlyPlayed';
import { PressableScale } from '../../components/ui/PressableScale';

function SkeletonRow() {
  const COLORS = useColors();
  const skeletonStyles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginBottom: 6,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
    },
    cover: {
      width: 46,
      height: 46,
      borderRadius: 10,
      backgroundColor: COLORS.surfaceElevated,
      marginRight: 12,
    },
    info: { flex: 1, gap: 8 },
    titleLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.surfaceElevated, width: '70%' },
    subtitleLine: { height: 10, borderRadius: 5, backgroundColor: COLORS.surface, width: '45%' },
  }), [COLORS]);

  return (
    <View style={skeletonStyles.row}>
      <View style={skeletonStyles.cover} />
      <View style={skeletonStyles.info}>
        <View style={skeletonStyles.titleLine} />
        <View style={skeletonStyles.subtitleLine} />
      </View>
    </View>
  );
}

// ─── Hero Card ───────────────────────────────────────────────────────────────

function HeroCard({
  track,
  isPlaying,
  onPress,
  label,
}: {
  track: TrackSummary;
  isPlaying: boolean;
  onPress: () => void;
  label: string;
}) {
  const COLORS = useColors();
  const heroStyles = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 14,
      borderRadius: 20,
      overflow: 'hidden',
      height: 210,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
    // Warm amber/rose/purple gradient simulation
    gradBase: {
      position: 'absolute', inset: 0,
      backgroundColor: '#8B4A35',
    },
    gradLayer1: {
      position: 'absolute', top: 0, right: 0, width: '65%', height: '100%',
      backgroundColor: '#6B2A5A',
      opacity: 0.85,
    },
    gradLayer2: {
      position: 'absolute', top: 0, left: 0, width: '50%', height: '60%',
      backgroundColor: '#C87B4E',
      opacity: 0.55,
    },
    gradLayer3: {
      position: 'absolute', bottom: 0, right: 0, width: '45%', height: '45%',
      backgroundColor: '#2D1040',
      opacity: 0.70,
    },
    coverImage: {
      position: 'absolute', inset: 0,
      width: '100%', height: '100%',
      opacity: 0.55,
    },
    // Scrim bottom-to-top
    scrim1: { position: 'absolute', bottom: 80, left: 0, right: 0, height: 50, backgroundColor: 'rgba(9,6,20,0.30)' },
    scrim2: { position: 'absolute', bottom: 30, left: 0, right: 0, height: 50, backgroundColor: 'rgba(9,6,20,0.60)' },
    scrim3: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(9,6,20,0.85)' },
    glassCard: {
      position: 'absolute',
      left: 14, right: 14, bottom: 14,
      backgroundColor: 'rgba(30,20,40,0.70)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 14,
      padding: 14,
    },
    nowPlayingLabel: {
      fontSize: 10,
      letterSpacing: 1.5,
      color: COLORS.accentLight,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 6,
    },
    trackTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: -0.4,
    },
    artistName: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      marginTop: 2,
    },
    playBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 14,
      elevation: 8,
    },
  }), [COLORS]);

  const artistNames = track.artists.map(a => a.name).join(', ');
  return (
    <PressableScale style={heroStyles.card} onPress={onPress} scaleDown={0.97} haptic="light">
      {/* Warm gradient background layers (no expo-linear-gradient needed) */}
      <View style={[heroStyles.gradBase]} />
      <View style={heroStyles.gradLayer1} />
      <View style={heroStyles.gradLayer2} />
      <View style={heroStyles.gradLayer3} />

      {/* Album art overlay if exists */}
      {track.coverUrl && (
        <Image source={{ uri: track.coverUrl }} style={heroStyles.coverImage} resizeMode="cover" />
      )}

      {/* Bottom scrim */}
      <View style={heroStyles.scrim1} />
      <View style={heroStyles.scrim2} />
      <View style={heroStyles.scrim3} />

      {/* Glass info card */}
      <View style={heroStyles.glassCard}>
        <Text style={heroStyles.nowPlayingLabel}>{label}</Text>
        <View style={heroStyles.trackRow}>
          <View style={{ flex: 1 }}>
            <Text style={heroStyles.trackTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={heroStyles.artistName} numberOfLines={1}>
              {artistNames}{track.isLocal ? ' 🇰🇿' : ''}
            </Text>
          </View>
          <View style={heroStyles.playBtn}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Underground Section ─────────────────────────────────────────────────────

function formatPlayCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${Math.floor(n / 100) / 10}K`;
  return `${Math.floor(n / 100_000) / 10}M`;
}

function UndergroundTrackRow({
  item,
  onPress,
  isActive,
  isPlaying,
}: {
  item: UndergroundTrackItem;
  onPress: () => void;
  isActive: boolean;
  isPlaying: boolean;
}) {
  const COLORS = useColors();
  const ugStyles = useMemo(() => StyleSheet.create({
    wrapper: {
      marginTop: 8,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    headerText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#F5F5F7',
      letterSpacing: -0.3,
      flex: 1,
    },
    headerSub: {
      fontSize: 12,
      color: COLORS.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginHorizontal: 16,
      marginBottom: 6,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      gap: 12,
    },
    coverWrap: {
      position: 'relative',
    },
    cover: {
      width: 46,
      height: 46,
      borderRadius: 10,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverFallback: {
      backgroundColor: COLORS.surfaceElevated,
    },
    coverActive: {
      borderWidth: 2,
      borderColor: COLORS.accent,
    },
    playingDot: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: COLORS.bg,
      borderRadius: 10,
      padding: 2,
    },
    info: {
      flex: 1,
      gap: 3,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: '#F5F5F7',
    },
    titleActive: {
      color: COLORS.accent,
    },
    artist: {
      fontSize: 12,
      color: COLORS.textMuted,
    },
    badge: {
      alignItems: 'flex-end',
      gap: 4,
    },
    firstBadge: {
      backgroundColor: 'rgba(200,123,78,0.2)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    firstBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.accent,
      letterSpacing: 0.3,
    },
    playCountText: {
      fontSize: 10,
      color: COLORS.textMuted,
    },
  }), [COLORS]);

  const isFirstListener = item.playCount < 100;
  return (
    <TouchableOpacity style={ugStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={ugStyles.coverWrap}>
        {item.release.coverUrl ? (
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          <View style={[ugStyles.cover, isActive && ugStyles.coverActive]}>
            <Text style={{ fontSize: 22 }}>🎵</Text>
          </View>
        ) : (
          <View style={[ugStyles.cover, ugStyles.coverFallback, isActive && ugStyles.coverActive]}>
            <Ionicons name="musical-note" size={20} color={COLORS.textMuted} />
          </View>
        )}
        {isActive && (
          <View style={ugStyles.playingDot}>
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={10}
              color={COLORS.accent}
            />
          </View>
        )}
      </View>
      <View style={ugStyles.info}>
        <Text style={[ugStyles.title, isActive && ugStyles.titleActive]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={ugStyles.artist} numberOfLines={1}>
          {item.artist.name}
          {item.artist.isLocal && ' · 🇰🇿'}
        </Text>
      </View>
      <View style={ugStyles.badge}>
        {isFirstListener && (
          <View style={ugStyles.firstBadge}>
            <Text style={ugStyles.firstBadgeText}>Первый</Text>
          </View>
        )}
        <Text style={ugStyles.playCountText}>{formatPlayCount(item.playCount)} прослуш.</Text>
      </View>
    </TouchableOpacity>
  );
}

function UndergroundSection() {
  const COLORS = useColors();
  const ugStyles = useMemo(() => StyleSheet.create({
    wrapper: {
      marginTop: 8,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    headerText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#F5F5F7',
      letterSpacing: -0.3,
      flex: 1,
    },
    headerSub: {
      fontSize: 12,
      color: COLORS.textMuted,
    },
  }), [COLORS]);

  const { accessToken } = useAuthStore();
  const playerStore = usePlayerStore();
  const currentTrack = playerStore.currentTrack;
  const isPlaying = playerStore.isPlaying;

  const query = useQuery({
    queryKey: ['underground'],
    queryFn: () => apiGet<UndergroundResponse>('/api/v1/recommendations/underground', { limit: '10' }),
    enabled: accessToken != null,
    staleTime: 5 * 60 * 1000,
  });

  if (!accessToken || query.isLoading) {
    return (
      <View style={ugStyles.wrapper}>
        <View style={ugStyles.header}>
          <Ionicons name="radio-outline" size={18} color={COLORS.accent} />
          <Text style={ugStyles.headerText}>Радар андеграунда</Text>
        </View>
        {[1, 2, 3].map((k) => <SkeletonRow key={k} />)}
      </View>
    );
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <View style={ugStyles.wrapper}>
      <View style={ugStyles.header}>
        <Ionicons name="radio-outline" size={18} color={COLORS.accent} />
        <Text style={ugStyles.headerText}>Радар андеграунда</Text>
        <Text style={ugStyles.headerSub}>Малоизвестные треки</Text>
      </View>
      {items.map((item) => {
        const isActive = currentTrack?.id === item.id;
        return (
          <UndergroundTrackRow
            key={item.id}
            item={item}
            isActive={isActive}
            isPlaying={isActive && isPlaying}
            onPress={() => {
              const queue = items.map((t) => ({
                id: t.id,
                title: t.title,
                durationMs: t.durationMs,
                artists: [{ id: t.artist.id, name: t.artist.name, slug: t.artist.id }],
                coverUrl: t.release.coverUrl,
                playbackStatus: 'PLAYABLE' as const,
                offlineEligible: false,
                isLocal: t.artist.isLocal,
                isExplicit: false,
              }));
              void playerStore.playTrack(queue.find((q) => q.id === item.id)!, queue);
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Genre Bridges Section ────────────────────────────────────────────────────

const GENRE_LABELS_BRIDGE: Record<string, string> = {
  pop: 'Поп', rock: 'Рок', jazz: 'Джаз', hiphop: 'Хип-хоп', 'hip-hop': 'Хип-хоп',
  electronic: 'Электроника', classical: 'Классика', folk: 'Народная', other: 'Другое',
};
function gl(s: string) { return GENRE_LABELS_BRIDGE[s.toLowerCase()] ?? s; }

function GenreBridgesSection() {
  const COLORS = useColors();
  const bridgeStyles = useMemo(() => StyleSheet.create({
    wrapper: { marginTop: 8 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    headerText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#F5F5F7',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      color: COLORS.textMuted,
      marginTop: 2,
    },
  }), [COLORS]);

  const { accessToken } = useAuthStore();
  const playerStore = usePlayerStore();

  const suggQuery = useQuery({
    queryKey: ['bridge-suggestion'],
    queryFn: () => apiGet<BridgeSuggestionResponse>('/api/v1/genre-bridges/suggestion'),
    enabled: accessToken != null,
    staleTime: 24 * 60 * 60 * 1000, // 1 day
  });

  const fromGenre = suggQuery.data?.fromGenre;
  const toGenre = suggQuery.data?.toGenre;

  const bridgeQuery = useQuery({
    queryKey: ['genre-bridge', fromGenre, toGenre],
    queryFn: () =>
      apiGet<GenreBridgeResponse>('/api/v1/genre-bridges', {
        from: fromGenre!,
        to: toGenre!,
        limit: '6',
      }),
    enabled: accessToken != null && fromGenre != null && toGenre != null,
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (!accessToken || !fromGenre || !toGenre || bridgeQuery.isLoading) return null;

  const tracks = bridgeQuery.data?.tracks ?? [];
  if (tracks.length === 0) return null;

  return (
    <View style={bridgeStyles.wrapper}>
      <View style={bridgeStyles.header}>
        <Ionicons name="git-merge-outline" size={18} color={COLORS.accent} />
        <View style={{ flex: 1 }}>
          <Text style={bridgeStyles.headerText}>Мост жанров</Text>
          <Text style={bridgeStyles.subtitle}>
            {gl(fromGenre)} → {gl(toGenre)}
          </Text>
        </View>
      </View>
      {tracks.map(({ track }) => {
        const isActive = playerStore.currentTrack?.id === track.id;
        return (
          <TrackRow
            key={track.id}
            track={track}
            isActive={isActive}
            isPlaying={isActive && playerStore.isPlaying}
            isLoading={isActive && playerStore.isLoading}
            onPress={() => {
              const queue = tracks.map((bt) => bt.track);
              void playerStore.playTrack(track, queue);
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Section Header with optional "See all" ───────────────────────────────────

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
}

function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const COLORS = useColors();
  const shStyles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    bar: {
      width: 3,
      height: 18,
      backgroundColor: COLORS.accent,
      borderRadius: 2,
      marginRight: 10,
    },
    title: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: '#F5F5F7',
      letterSpacing: -0.3,
    },
    seeAll: {
      fontSize: 13,
      fontWeight: '500',
      color: COLORS.accent,
    },
  }), [COLORS]);

  return (
    <View style={shStyles.row}>
      <View style={shStyles.bar} />
      <Text style={shStyles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={shStyles.seeAll}>Все →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Chart Section ────────────────────────────────────────────────────────────

interface ChartSectionProps {
  chart: ChartResponse;
}

function ChartSection({ chart }: ChartSectionProps) {
  const COLORS = useColors();
  const chartStyles = useMemo(() => StyleSheet.create({
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rank: {
      width: 46,
      paddingLeft: 14,
      fontSize: 22,
      fontWeight: '700',
      color: COLORS.textSecondary,
    },
    rankGold: {
      color: COLORS.gold,
    },
    trackRowWrap: {
      flex: 1,
    },
    trendBox: {
      width: 46,
      alignItems: 'flex-end',
      paddingRight: 16,
    },
    trendText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  }), [COLORS]);

  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();
  const tracks = chart.entries.map(e => e.track);

  return (
    <View>
      <SectionHeader title="Топ KZ" onSeeAll={() => {}} />
      {chart.entries.map((entry) => {
        const isActive = currentTrack?.id === entry.track.id;
        const pos = entry.position;
        const delta = entry.prevPos != null ? entry.prevPos - pos : 0;
        const rankStr = pos.toString().padStart(2, '0');
        return (
          <View key={entry.track.id} style={chartStyles.entryRow}>
            <Text style={[chartStyles.rank, pos === 1 && chartStyles.rankGold]}>{rankStr}</Text>
            <View style={chartStyles.trackRowWrap}>
              <TrackRow
                track={entry.track}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                isLoading={isActive && playerLoading}
                onPress={() => void playTrack(entry.track, tracks)}
              />
            </View>
            <View style={chartStyles.trendBox}>
              {delta !== 0 && (
                <Text style={[chartStyles.trendText, { color: delta > 0 ? '#4ECDC4' : '#FF6B6B' }]}>
                  {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Recently Played Section ─────────────────────────────────────────────────

function RecentlyPlayedSection() {
  const COLORS = useColors();
  const rpStyles = useMemo(() => StyleSheet.create({
    wrapper: { marginBottom: 4 },
    scroll: { paddingHorizontal: 16, gap: 12 },
    card: { width: 110 },
    cover: { width: 110, height: 110, borderRadius: 14, marginBottom: 8 },
    coverFallback: {
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeOverlay: {
      position: 'absolute',
      top: 0, left: 0, width: 110, height: 110,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 16 },
    titleActive: { color: COLORS.accent },
    artist: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  }), [COLORS]);

  // shStyles for the section header row (inline, no separate SectionHeader component used here)
  const shStyles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    title: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: '#F5F5F7',
      letterSpacing: -0.3,
    },
  }), []);

  const tracks = useRecentlyPlayedStore(s => s.tracks);
  const { currentTrack, isPlaying, playTrack } = usePlayerStore();

  if (tracks.length === 0) return null;

  return (
    <View style={rpStyles.wrapper}>
      <View style={shStyles.row}>
        <Text style={shStyles.title}>Недавно слушал</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={rpStyles.scroll}
      >
        {tracks.map((track) => {
          const isActive = currentTrack?.id === track.id;
          return (
            <TouchableOpacity
              key={track.id}
              style={rpStyles.card}
              onPress={() => void playTrack(track, tracks)}
              activeOpacity={0.75}
            >
              {track.coverUrl ? (
                <Image source={{ uri: track.coverUrl }} style={rpStyles.cover} resizeMode="cover" />
              ) : (
                <View style={[rpStyles.cover, rpStyles.coverFallback]}>
                  <Ionicons name="musical-note" size={22} color={COLORS.textMuted} />
                </View>
              )}
              {isActive && (
                <View style={rpStyles.activeOverlay}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
                </View>
              )}
              <Text style={[rpStyles.title, isActive && rpStyles.titleActive]} numberOfLines={2}>
                {track.title}
              </Text>
              <Text style={rpStyles.artist} numberOfLines={1}>
                {track.artists.map(a => a.name).join(', ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 20,
    },
    greeting: {
      fontSize: 30,
      fontWeight: '800',
      color: COLORS.textPrimary,
      letterSpacing: -0.8,
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 5,
    },
    subtitleDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.accent,
      opacity: 0.8,
    },
    subtitle: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: COLORS.textPrimary,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
      letterSpacing: -0.3,
    },
    listContent: {
      paddingBottom: 160,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    errorText: {
      fontSize: 16,
      color: COLORS.textSecondary,
    },
    retryButton: {
      backgroundColor: COLORS.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 20,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
  }), [COLORS]);

  const { t } = useTranslation();
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();

  const user = useAuthStore(s => s.user);
  const isLoggedIn = !!user;
  const qc = useQueryClient();
  const recentTracks = useRecentlyPlayedStore(s => s.tracks);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер';
  const displayName = user?.displayName ?? 'Слушатель';

  const homeQuery = useQuery({
    queryKey: ['home'],
    queryFn: () =>
      apiGet<HomeResponse>('/api/v1/catalog/home', {
        locale: 'ru',
        territory: 'KZ',
      }),
    staleTime: 1000 * 60 * 5,
  });

  const chartQuery = useQuery({
    queryKey: ['chart', 'top-kz'],
    queryFn: () => apiGet<ChartResponse>('/api/v1/charts/top-kz'),
    staleTime: 1000 * 60 * 10,
  });

  const recsQuery = useQuery({
    queryKey: ['recommendations', 'for-you'],
    queryFn: () => apiGet<RecommendationsResponse>('/api/v1/recommendations/for-you'),
    staleTime: 1000 * 60 * 5,
    enabled: isLoggedIn,
  });

  const handleFeedback = async (trackId: string, kind: FeedbackKind) => {
    try {
      await apiPost('/api/v1/recommendations/feedback', { trackId, kind });
      void qc.invalidateQueries({ queryKey: ['recommendations', 'for-you'] });
    } catch {
      // Silently ignore — feedback is best-effort
    }
  };

  const isLoading = homeQuery.isLoading;
  const isError = homeQuery.isError;
  const isRefetching = homeQuery.isRefetching || chartQuery.isRefetching || recsQuery.isRefetching;

  const onRefresh = () => {
    void homeQuery.refetch();
    void chartQuery.refetch();
    void recsQuery.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}, {displayName}</Text>
        </View>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sections = homeQuery.data?.sections ?? [];

  const recTracks = recsQuery.data?.items ?? [];

  type ListItem =
    | { type: 'hero'; track: TrackSummary; isNowPlaying: boolean }
    | { type: 'recently-played' }
    | { type: 'chart' }
    | { type: 'underground' }
    | { type: 'bridges' }
    | { type: 'recs-header' }
    | { type: 'recs-track'; track: TrackSummary }
    | { type: 'header'; section: HomeSection }
    | { type: 'track'; track: TrackSummary; section: HomeSection };

  const heroTrack = currentTrack ?? chartQuery.data?.entries[0]?.track ?? null;

  const listData: ListItem[] = [
    // Hero card at the very top
    ...(heroTrack ? [{ type: 'hero' as const, track: heroTrack, isNowPlaying: !!currentTrack }] : []),
    // Recently played at the top (client-side, no network)
    ...(recentTracks.length > 0 ? [{ type: 'recently-played' as const }] : []),
    // Chart section as the first item (renders ChartSection component)
    ...(chartQuery.data ? [{ type: 'chart' as const }] : []),
    // Recommendations section (logged-in only)
    ...(recTracks.length > 0
      ? [
          { type: 'recs-header' as const },
          ...recTracks.map((track) => ({ type: 'recs-track' as const, track })),
        ]
      : []),
    // Then catalog sections
    ...sections.flatMap((section) => [
      { type: 'header' as const, section },
      ...section.items.map((track) => ({
        type: 'track' as const,
        track,
        section,
      })),
    ]),
    // Genre Bridges
    { type: 'bridges' as const },
    // Underground Radar at the end
    { type: 'underground' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => {
          if (item.type === 'hero') return `hero-${item.track.id}`;
          if (item.type === 'recently-played') return 'recently-played';
          if (item.type === 'chart') return 'chart-top-kz';
          if (item.type === 'underground') return 'underground';
          if (item.type === 'bridges') return 'bridges';
          if (item.type === 'recs-header') return 'recs-header';
          if (item.type === 'recs-track') return `recs-track-${item.track.id}`;
          if (item.type === 'header') return `header-${item.section.id}`;
          return `track-${item.track.id}-${item.section.id}`;
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}, {displayName}</Text>
            <View style={styles.subtitleRow}>
              <View style={styles.subtitleDot} />
              <Text style={styles.subtitle}>Степной резонанс сегодня</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'hero') {
            return (
              <HeroCard
                track={item.track}
                isPlaying={item.isNowPlaying && isPlaying}
                label={item.isNowPlaying ? 'Играет сейчас' : 'Топ KZ'}
                onPress={() => void playTrack(item.track, chartQuery.data?.entries.map(e => e.track) ?? [item.track])}
              />
            );
          }
          if (item.type === 'recently-played') {
            return <RecentlyPlayedSection />;
          }
          if (item.type === 'chart') {
            return chartQuery.data ? (
              <ChartSection chart={chartQuery.data} />
            ) : null;
          }
          if (item.type === 'bridges') {
            return <GenreBridgesSection />;
          }
          if (item.type === 'underground') {
            return <UndergroundSection />;
          }
          if (item.type === 'recs-header') {
            return <SectionHeader title={t('home.recommended')} />;
          }
          if (item.type === 'recs-track') {
            const { track } = item;
            const isActive = currentTrack?.id === track.id;
            return (
              <TrackRow
                track={track}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                isLoading={isActive && playerLoading}
                onPress={() => void playTrack(track, recTracks)}
                onFeedback={(kind) => void handleFeedback(track.id, kind)}
              />
            );
          }
          if (item.type === 'header') {
            // Map section IDs to i18n keys for locale-aware titles
            const sectionTitleMap: Record<string, string> = {
              'new-kz': t('home.new_kz'),
              'popular': t('home.popular'),
              'recommended': t('home.recommended'),
              'kazakh-music': t('home.kazakh_music'),
            };
            const title = sectionTitleMap[item.section.id] ?? item.section.title;
            return <SectionHeader title={title} />;
          }
          const { track, section } = item;
          const isActive = currentTrack?.id === track.id;
          return (
            <TrackRow
              track={track}
              isActive={isActive}
              isPlaying={isActive && isPlaying}
              isLoading={isActive && playerLoading}
              onPress={() => void playTrack(track, section.items)}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}
