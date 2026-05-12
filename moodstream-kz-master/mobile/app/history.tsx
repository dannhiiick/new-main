import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '../components/track/TrackRow';
import { useColors } from '../hooks/useColors';
import { apiGet } from '../lib/api';
import { usePlayerStore } from '../store/player';

interface HistoryItem {
  playedAt: string;
  track: {
    id: string;
    title: string;
    durationMs: number;
    artists: { id: string; name: string; slug: string }[];
    coverUrl: string | null;
    playbackStatus: 'PLAYABLE' | 'PROCESSING' | 'BLOCKED';
    offlineEligible: boolean;
    isLocal: boolean;
    isExplicit: boolean;
  };
}

interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 2) return 'Только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  if (diffH < 24) return `${diffH} ч назад`;
  if (diffD === 1) return 'Вчера';
  if (diffD < 7) return `${diffD} дн назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['listening-history'],
    queryFn: ({ pageParam }) =>
      apiGet<HistoryPage>(`/api/v1/library/history${pageParam ? `?cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 1000 * 60,
  });

  const items = useMemo(
    () => data?.pages.flatMap(p => p.items) ?? [],
    [data],
  );

  const tracks = useMemo(() => items.map(i => i.track), [items]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
    dateLabel: {
      fontSize: 11,
      color: COLORS.textMuted,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    empty: {
      flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80,
    },
    emptyText: { fontSize: 16, color: COLORS.textMuted },
    footer: { paddingVertical: 20, alignItems: 'center' },
  }), [COLORS]);

  // Group items by date label
  type Row = { type: 'date'; label: string } | { type: 'track'; item: HistoryItem; index: number };

  const rows = useMemo((): Row[] => {
    const result: Row[] = [];
    let lastLabel = '';
    items.forEach((item, index) => {
      const label = formatRelativeDate(item.playedAt);
      const dateLabel = new Date(item.playedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      const groupKey = new Date(item.playedAt).toDateString();
      if (groupKey !== lastLabel) {
        result.push({ type: 'date', label: dateLabel });
        lastLabel = groupKey;
      }
      result.push({ type: 'track', item, index });
    });
    return result;
  }, [items]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>История</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={52} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>История пуста</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, i) => row.type === 'date' ? `d-${i}` : row.item.playedAt + row.index}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListFooterComponent={
            isFetchingNextPage
              ? <View style={styles.footer}><ActivityIndicator color={COLORS.accent} /></View>
              : null
          }
          renderItem={({ item: row }) => {
            if (row.type === 'date') {
              return <Text style={styles.dateLabel}>{row.label}</Text>;
            }
            const { item, index } = row;
            const isActive = currentTrack?.id === item.track.id;
            return (
              <TrackRow
                track={item.track}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                isLoading={isActive && playerLoading}
                index={index}
                onPress={() => void playTrack(item.track, tracks)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
