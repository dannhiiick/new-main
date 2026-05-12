import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  PanResponder,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '../../components/track/TrackRow';
import { useColors } from '../../hooks/useColors';
import { removeDownload } from '../../lib/downloader';
import { apiDelete, apiGet, apiPost } from '../../lib/api';
import type { LibraryLikedResponse, PlaylistListItem, TrackSummary } from '../../lib/types';
import { useOfflineStore } from '../../store/offline';
import { usePlayerStore } from '../../store/player';

type Tab = 'liked' | 'offline' | 'playlists';

const TAB_ORDER: Tab[] = ['liked', 'playlists', 'offline'];

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function TrackRowSkeleton({ shimmer }: { shimmer: Animated.Value }) {
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
    titleLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.surfaceElevated, width: '68%' },
    subtitleLine: { height: 10, borderRadius: 5, backgroundColor: COLORS.surface, width: '45%' },
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

function LikedSkeleton() {
  const shimmer = useRef(new Animated.Value(0.4)).current;

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
    <View style={{ paddingTop: 4 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TrackRowSkeleton key={i} shimmer={shimmer} />
      ))}
    </View>
  );
}

// ─── Liked Section ────────────────────────────────────────────────────────────

function LikedSection({ sortOrder }: { sortOrder: 'recent' | 'alpha' | 'artist' }) {
  const COLORS = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();

  const {
    data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['library-liked'],
    queryFn: ({ pageParam }) =>
      apiGet<LibraryLikedResponse>(`/api/v1/library/liked${pageParam ? `?cursor=${pageParam}` : ''}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 2,
  });

  const unlikeMutation = useMutation({
    mutationFn: (trackId: string) => apiDelete(`/api/v1/library/like/${trackId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library-liked'] });
    },
  });

  const tracks = useMemo(() => {
    const raw = data?.pages.flatMap(p => p.items) ?? [];
    if (sortOrder === 'alpha') {
      return [...raw].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    }
    if (sortOrder === 'artist') {
      return [...raw].sort((a, b) => {
        const aName = a.artists[0]?.name ?? '';
        const bName = b.artists[0]?.name ?? '';
        return aName.localeCompare(bName, 'ru');
      });
    }
    return raw; // 'recent' — API order
  }, [data, sortOrder]);

  const styles = useMemo(() => StyleSheet.create({
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 16,
    },
    mutedText: {
      fontSize: 15,
      color: COLORS.textMuted,
    },
    retryBtn: {
      backgroundColor: COLORS.accent,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    retryText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: '#fff',
    },
    listContent: {
      paddingBottom: 160,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: COLORS.textSecondary,
    },
    emptyHint: {
      fontSize: 14,
      color: COLORS.textMuted,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  }), [COLORS]);

  if (isLoading) {
    return <LikedSkeleton />;
  }

  if (isError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.mutedText}>{t('common.error')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => void refetch()}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={COLORS.accent} style={{ paddingVertical: 16 }} /> : null}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={COLORS.accent}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('library.empty')}</Text>
          <Text style={styles.emptyHint}>{t('library.empty_hint')}</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isActive = currentTrack?.id === item.id;
        return (
          <TrackRow
            track={item}
            isActive={isActive}
            isPlaying={isActive && isPlaying}
            isLoading={isActive && playerLoading}
            index={index}
            onPress={() => void playTrack(item, tracks)}
            onLike={() => unlikeMutation.mutate(item.id)}
            liked={true}
          />
        );
      }}
    />
  );
}

// ─── Offline Section ──────────────────────────────────────────────────────────

function OfflineSection() {
  const COLORS = useColors();
  const { t } = useTranslation();
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();
  const entries = useOfflineStore(s => s.entries);

  const styles = useMemo(() => StyleSheet.create({
    listContent: {
      paddingBottom: 160,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: COLORS.textSecondary,
    },
    emptyHint: {
      fontSize: 14,
      color: COLORS.textMuted,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  }), [COLORS]);

  const downloadedTracks: TrackSummary[] = Object.values(entries)
    .filter(e => e.state === 'done' && e.track != null)
    .sort((a, b) => {
      const dateA = a.downloadedAt ?? '';
      const dateB = b.downloadedAt ?? '';
      return dateB.localeCompare(dateA);
    })
    .map(e => e.track!);

  return (
    <FlatList
      data={downloadedTracks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="arrow-down-circle-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('library.offline_empty')}</Text>
          <Text style={styles.emptyHint}>{t('library.offline_empty_hint')}</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isActive = currentTrack?.id === item.id;
        return (
          <TrackRow
            track={item}
            isActive={isActive}
            isPlaying={isActive && isPlaying}
            isLoading={isActive && playerLoading}
            index={index}
            onPress={() => void playTrack(item, downloadedTracks)}
            onLike={() => void removeDownload(item.id)}
            liked={true}
          />
        );
      }}
    />
  );
}

// ─── Playlists Section ────────────────────────────────────────────────────────

function PlaylistsTab({
  playlists,
  loading,
  onCreatePress,
  createVisible,
  newTitle,
  onTitleChange,
  onSubmit,
  onCancelCreate,
}: {
  playlists: PlaylistListItem[];
  loading: boolean;
  onCreatePress: () => void;
  createVisible: boolean;
  newTitle: string;
  onTitleChange: (t: string) => void;
  onSubmit: () => Promise<void>;
  onCancelCreate: () => void;
}) {
  const COLORS = useColors();
  const router = useRouter();

  const playlistStyles = useMemo(() => StyleSheet.create({
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.accent,
      marginHorizontal: 16,
      marginVertical: 12,
      paddingVertical: 13,
      paddingHorizontal: 20,
      borderRadius: 14,
      justifyContent: 'center',
    },
    createBtnText: {
      color: COLORS.bg,
      fontSize: 15,
      fontWeight: '700' as const,
    },
    createForm: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 12,
      gap: 10,
    },
    createInput: {
      color: COLORS.textPrimary,
      fontSize: 15,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    createFormBtns: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    createFormCancelBtn: { padding: 6 },
    createFormCancelText: { color: COLORS.textSecondary, fontSize: 14 },
    createFormOkBtn: {
      backgroundColor: COLORS.accent,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 8,
    },
    createFormOkText: { color: COLORS.bg, fontSize: 14, fontWeight: '600' as const },
    playlistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 14,
      marginHorizontal: 16,
      marginBottom: 6,
      backgroundColor: COLORS.surfaceGlass,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    playlistCover: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playlistTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: COLORS.textPrimary,
      marginBottom: 2,
    },
    playlistMeta: {
      fontSize: 12,
      color: COLORS.textSecondary,
    },
  }), [COLORS]);

  return (
    <View style={{ flex: 1 }}>
      {/* Create button */}
      <TouchableOpacity
        style={playlistStyles.createBtn}
        onPress={onCreatePress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color={COLORS.bg} />
        <Text style={playlistStyles.createBtnText}>Создать плейлист</Text>
      </TouchableOpacity>

      {/* Android inline create form */}
      {createVisible && (
        <View style={playlistStyles.createForm}>
          <TextInput
            style={playlistStyles.createInput}
            placeholder="Название плейлиста"
            placeholderTextColor={COLORS.textMuted}
            value={newTitle}
            onChangeText={onTitleChange}
            autoFocus
            maxLength={100}
          />
          <View style={playlistStyles.createFormBtns}>
            <TouchableOpacity onPress={onCancelCreate} style={playlistStyles.createFormCancelBtn}>
              <Text style={playlistStyles.createFormCancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void onSubmit()} style={playlistStyles.createFormOkBtn}>
              <Text style={playlistStyles.createFormOkText}>Создать</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Загрузка...</Text>
        </View>
      ) : playlists.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center', gap: 8 }}>
          <Ionicons name="list-outline" size={40} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 14, textAlign: 'center' }}>
            {'У вас пока нет плейлистов.\nСоздайте первый!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 160 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={playlistStyles.playlistRow}
              onPress={() => router.push(`/playlist/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={playlistStyles.playlistCover}>
                <Ionicons name="musical-notes" size={22} color={COLORS.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={playlistStyles.playlistTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={playlistStyles.playlistMeta}>
                  {item._count.tracks} треков · {item.visibility === 'PRIVATE' ? 'Приватный' : 'Публичный'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const COLORS = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { playTrack } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<Tab>('liked');
  const [createVisible, setCreateVisible] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [libSearch, setLibSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha' | 'artist'>('recent');

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
      fontWeight: '800' as const,
      color: COLORS.textPrimary,
      letterSpacing: -1,
    },
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 8,
    },
    tabPill: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 24,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    tabPillActive: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: COLORS.textSecondary,
    },
    tabLabelActive: {
      color: '#fff',
    },
    libSearchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    libSearchInput: {
      flex: 1,
      fontSize: 14,
      color: COLORS.textPrimary,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    sortOptions: {
      flexDirection: 'row',
      gap: 16,
    },
    sortBtn: {
      alignItems: 'center',
      paddingBottom: 2,
    },
    sortText: {
      fontSize: 13,
      color: COLORS.textMuted,
      fontWeight: '500' as const,
    },
    sortTextActive: {
      color: COLORS.accent,
      fontWeight: '700' as const,
    },
    sortUnderline: {
      height: 2,
      backgroundColor: COLORS.accent,
      borderRadius: 1,
      marginTop: 2,
      alignSelf: 'stretch',
    },
    playAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    playAllText: {
      fontSize: 13,
      color: COLORS.accent,
      fontWeight: '600' as const,
    },
    contentArea: {
      flex: 1,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      paddingBottom: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    dotActive: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
      width: 18,
    },
  }), [COLORS]);

  const { data: playlistsData, isLoading: playlistsLoading, refetch: refetchPlaylists } = useQuery({
    queryKey: ['my-playlists'],
    queryFn: () => apiGet<{ items: PlaylistListItem[]; nextCursor: string | null }>('/api/v1/playlists'),
    staleTime: 1000 * 30,
  });

  const { data: likedData } = useQuery({
    queryKey: ['library-liked'],
    queryFn: () => apiGet<LibraryLikedResponse>('/api/v1/library/liked'),
    staleTime: 1000 * 60 * 2,
  });

  const offlineEntries = useOfflineStore(s => s.entries);
  const likedCount = likedData?.items.length;
  const playlistCount = playlistsData?.items.length;
  const offlineCount = Object.values(offlineEntries).filter(e => e.state === 'done').length;

  // Swipe between tabs
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 40) return;
        const idx = TAB_ORDER.indexOf(activeTabRef.current);
        if (g.dx < 0 && idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1]);
        else if (g.dx > 0 && idx > 0) setActiveTab(TAB_ORDER[idx - 1]);
      },
    })
  ).current;

  const handleCreatePlaylist = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Новый плейлист', 'Название', async (title) => {
        if (!title?.trim()) return;
        try {
          await apiPost('/api/v1/playlists', { title: title.trim(), visibility: 'PRIVATE' });
          void refetchPlaylists();
        } catch {
          Alert.alert('Ошибка', 'Не удалось создать');
        }
      }, 'plain-text');
    } else {
      setCreateVisible(true);
      setNewPlaylistTitle('');
    }
  };

  const submitCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    try {
      await apiPost('/api/v1/playlists', { title: newPlaylistTitle.trim(), visibility: 'PRIVATE' });
      setCreateVisible(false);
      setNewPlaylistTitle('');
      void refetchPlaylists();
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать');
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'liked', label: 'Понравившееся', count: likedCount },
    { key: 'playlists', label: 'Плейлисты', count: playlistCount },
    { key: 'offline', label: 'Офлайн', count: offlineCount > 0 ? offlineCount : undefined },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Медиатека</Text>
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabPill, active && styles.tabPillActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
                {tab.count != null ? ` ${tab.count}` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Library search bar */}
      <View style={styles.libSearchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.libSearchInput}
          value={libSearch}
          onChangeText={setLibSearch}
          placeholder="Поиск в библиотеке"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Sort row — only for liked tab */}
      {activeTab === 'liked' && (
        <View style={styles.sortRow}>
          <View style={styles.sortOptions}>
            {(['recent', 'alpha', 'artist'] as const).map(sort => (
              <TouchableOpacity key={sort} onPress={() => setSortOrder(sort)} style={styles.sortBtn}>
                <Text style={[styles.sortText, sortOrder === sort && styles.sortTextActive]}>
                  {sort === 'recent' ? 'Недавние' : sort === 'alpha' ? 'А→Я' : 'Артист'}
                </Text>
                {sortOrder === sort && <View style={styles.sortUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.playAllBtn}
            onPress={() => {
              type InfiniteData = { pages: LibraryLikedResponse[] };
              const cached = qc.getQueryData<InfiniteData>(['library-liked']);
              const tracks = cached?.pages.flatMap(p => p.items) ?? [];
              if (tracks.length > 0) void playTrack(tracks[0]!, tracks);
            }}
          >
            <Ionicons name="play" size={11} color={COLORS.accent} />
            <Text style={styles.playAllText}>Воспр. все</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Swipe dot indicators */}
      <View style={styles.dotsRow}>
        {TAB_ORDER.map(tab => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <View style={[styles.dot, activeTab === tab && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Content — swipeable */}
      <View style={styles.contentArea} {...panResponder.panHandlers}>
        {activeTab === 'liked' && <LikedSection sortOrder={sortOrder} />}
        {activeTab === 'offline' && <OfflineSection />}
        {activeTab === 'playlists' && (
          <PlaylistsTab
            playlists={playlistsData?.items ?? []}
            loading={playlistsLoading}
            onCreatePress={handleCreatePlaylist}
            createVisible={createVisible}
            newTitle={newPlaylistTitle}
            onTitleChange={setNewPlaylistTitle}
            onSubmit={submitCreatePlaylist}
            onCancelCreate={() => setCreateVisible(false)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
