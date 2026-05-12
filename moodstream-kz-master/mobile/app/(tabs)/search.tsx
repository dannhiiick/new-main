import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { TrackRow } from '../../components/track/TrackRow';
import { useColors } from '../../hooks/useColors';
import { apiGet } from '../../lib/api';
import type { ArtistItem, SearchResponse } from '../../lib/types';
import { usePlayerStore } from '../../store/player';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Browse tiles ─────────────────────────────────────────────────────────────

const BROWSE_TILES = [
  { id: 'kazakh', label: 'Казахская', emoji: '🇰🇿', bg: '#6B3D1C' },
  { id: 'charts', label: 'Чарты', emoji: '🔥', bg: '#6B1C2A' },
  { id: 'new', label: 'Новинки', emoji: '✨', bg: '#5A4A1A' },
  { id: 'underground', label: 'Андеграунд', emoji: '🌙', bg: '#1A3D5A' },
  { id: 'mood', label: 'Настроение', emoji: '😌', bg: '#3A1A5A' },
  { id: 'genre', label: 'Жанры', emoji: '🎸', bg: '#1A4A3A' },
] as const;

// ─── Search Skeletons ─────────────────────────────────────────────────────────

function SearchTrackRowSkeleton({ shimmer }: { shimmer: Animated.Value }) {
  const COLORS = useColors();
  const s = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      marginHorizontal: 16, marginBottom: 6,
      backgroundColor: COLORS.surfaceGlass,
      borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderSubtle,
    },
    cover: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.surfaceElevated, marginRight: 12 },
    info: { flex: 1, gap: 8 },
    titleLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.surfaceElevated, width: '65%' },
    subtitleLine: { height: 10, borderRadius: 5, backgroundColor: COLORS.surface, width: '42%' },
  }), [COLORS]);
  return (
    <Animated.View style={[s.row, { opacity: shimmer }]}>
      <View style={s.cover} />
      <View style={s.info}>
        <View style={s.titleLine} />
        <View style={s.subtitleLine} />
      </View>
    </Animated.View>
  );
}

function SearchSkeleton() {
  const COLORS = useColors();
  const shimmer = useRef(new Animated.Value(0.4)).current;
  const headerStyle = useMemo(() => ({
    height: 12, borderRadius: 6,
    backgroundColor: COLORS.surfaceElevated,
    width: '28%' as const,
    marginHorizontal: 24, marginTop: 20, marginBottom: 12,
  }), [COLORS]);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  return (
    <View>
      <Animated.View style={[headerStyle, { opacity: shimmer }]} />
      {Array.from({ length: 4 }).map((_, i) => (
        <SearchTrackRowSkeleton key={i} shimmer={shimmer} />
      ))}
    </View>
  );
}

function ArtistRow({ artist, onPress }: { artist: ArtistItem; onPress: () => void }) {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    artistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      gap: 12,
    },
    artistAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    artistName: {
      fontSize: 15,
      fontWeight: '500',
      color: COLORS.textPrimary,
      flex: 1,
    },
  }), [COLORS]);

  return (
    <TouchableOpacity style={styles.artistRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.artistAvatar}>
        <Ionicons name="person" size={20} color={COLORS.textMuted} />
      </View>
      <Text style={styles.artistName}>{artist.name}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: COLORS.textPrimary,
      letterSpacing: -1,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
    },
    searchIcon: {
      marginRight: 2,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: COLORS.textPrimary,
    },
    // Idle state
    idleContent: {
      paddingBottom: 160,
    },
    recentSection: {
      paddingHorizontal: 24,
      marginBottom: 22,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: COLORS.textMuted,
      letterSpacing: 1.2,
      marginBottom: 12,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipText: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    browseHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginBottom: 14,
    },
    browseBar: {
      width: 3,
      height: 18,
      backgroundColor: COLORS.accent,
      borderRadius: 2,
      marginRight: 10,
    },
    browseTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: COLORS.textPrimary,
      letterSpacing: -0.3,
    },
    browseGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 10,
    },
    browseTile: {
      width: '47.5%',
      height: 110,
      borderRadius: 16,
      overflow: 'hidden',
      padding: 14,
      justifyContent: 'space-between',
    },
    tileCircle1: {
      position: 'absolute',
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.12)',
      right: -35,
      top: -20,
    },
    tileCircle2: {
      position: 'absolute',
      width: 75,
      height: 75,
      borderRadius: 37,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.08)',
      right: 5,
      top: 15,
    },
    tileEmoji: {
      fontSize: 24,
    },
    tileLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: -0.3,
    },
    // Results
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.textSecondary,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    listContent: {
      paddingBottom: 160,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingBottom: 120,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    emptyText: {
      fontSize: 14,
      color: COLORS.textMuted,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: COLORS.accent,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    retryText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
  }), [COLORS]);

  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 400);
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();

  useEffect(() => {
    if (debouncedQuery.length > 1) {
      setRecentSearches(prev =>
        [debouncedQuery, ...prev.filter(s => s !== debouncedQuery)].slice(0, 6)
      );
    }
  }, [debouncedQuery]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () =>
      apiGet<SearchResponse>('/api/v1/catalog/search', {
        q: debouncedQuery,
        locale: 'ru',
        territory: 'KZ',
      }),
    enabled: debouncedQuery.length > 1,
    staleTime: 1000 * 30,
  });

  const tracks = data?.tracks ?? [];
  const artists = data?.artists ?? [];
  const hasResults = tracks.length > 0 || artists.length > 0;
  const isSearching = debouncedQuery.length > 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Поиск</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="mic-outline" size={20} color={COLORS.textMuted} />
        )}
      </View>

      {/* Idle: recent searches + browse grid */}
      {!isSearching && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.idleContent}
        >
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionLabel}>НЕДАВНИЕ</Text>
              <View style={styles.chipsRow}>
                {recentSearches.map(s => (
                  <TouchableOpacity key={s} style={styles.chip} onPress={() => setQuery(s)}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Browse header with | bar */}
          <View style={styles.browseHeaderRow}>
            <View style={styles.browseBar} />
            <Text style={styles.browseTitle}>Обзор</Text>
          </View>

          {/* 2-column grid */}
          <View style={styles.browseGrid}>
            {BROWSE_TILES.map(tile => (
              <TouchableOpacity
                key={tile.id}
                style={[styles.browseTile, { backgroundColor: tile.bg }]}
                activeOpacity={0.8}
                onPress={() => {
                  const queries: Record<typeof tile.id, string> = {
                    kazakh: 'казахская',
                    charts: 'чарты',
                    new: 'новинки',
                    underground: 'андеграунд',
                    mood: 'настроение',
                    genre: 'жанр',
                  };
                  setQuery(queries[tile.id]);
                }}
              >
                <View style={styles.tileCircle1} />
                <View style={styles.tileCircle2} />
                <Text style={styles.tileEmoji}>{tile.emoji}</Text>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Loading skeleton */}
      {isLoading && isSearching && <SearchSkeleton />}

      {/* Error */}
      {isError && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('common.error')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void refetch()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No results */}
      {!isLoading && !isError && isSearching && !hasResults && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('search.no_results')}</Text>
          <Text style={styles.emptyText}>{t('search.no_results_hint')}</Text>
        </View>
      )}

      {/* Results */}
      {hasResults && (
        <FlatList
          data={[
            ...(tracks.length > 0
              ? [{ type: 'section-header', label: t('search.tracks') }]
              : []),
            ...tracks.map((t) => ({ type: 'track', data: t })),
            ...(artists.length > 0
              ? [{ type: 'section-header', label: t('search.artists') }]
              : []),
            ...artists.map((a) => ({ type: 'artist', data: a })),
          ]}
          keyExtractor={(item, idx) => {
            if (item.type === 'section-header') return `sh-${idx}`;
            if (item.type === 'track') return `track-${'data' in item ? (item.data as { id: string }).id : idx}`;
            return `artist-${'data' in item ? (item.data as { id: string }).id : idx}`;
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'section-header') {
              return (
                <Text style={styles.sectionTitle}>
                  {'label' in item ? item.label : ''}
                </Text>
              );
            }
            if (item.type === 'track' && 'data' in item) {
              const track = item.data as (typeof tracks)[number];
              const isActive = currentTrack?.id === track.id;
              return (
                <TrackRow
                  track={track}
                  isActive={isActive}
                  isPlaying={isActive && isPlaying}
                  isLoading={isActive && playerLoading}
                  onPress={() => void playTrack(track, tracks)}
                />
              );
            }
            if (item.type === 'artist' && 'data' in item) {
              const artist = item.data as ArtistItem;
              return <ArtistRow artist={artist} onPress={() => router.push(`/artist/${artist.id}`)} />;
            }
            return null;
          }}
        />
      )}
    </SafeAreaView>
  );
}
