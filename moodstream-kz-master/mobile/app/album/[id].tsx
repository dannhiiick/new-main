import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '../../components/track/TrackRow';
import { useColors } from '../../hooks/useColors';
import { apiGet } from '../../lib/api';
import type { ReleaseDetail } from '../../lib/types';
import { usePlayerStore } from '../../store/player';

const RELEASE_TYPE_LABELS: Record<string, string> = {
  ALBUM: 'Альбом',
  SINGLE: 'Сингл',
  EP: 'EP',
  COMPILATION: 'Сборник',
};

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AlbumScreen() {
  const COLORS = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack, toggleShuffle, shuffle } = usePlayerStore();

  const { data: release, isLoading, isError } = useQuery({
    queryKey: ['release', id],
    queryFn: () => apiGet<ReleaseDetail>(`/api/v1/catalog/releases/${id ?? ''}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });

  const totalDurationMs = release?.tracks.reduce((sum, t) => sum + t.durationMs, 0) ?? 0;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    mutedText: { fontSize: 14, color: COLORS.textMuted },
    listContent: { paddingBottom: 120 },
    releaseHeader: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    cover: {
      width: 200,
      height: 200,
      borderRadius: 20,
      marginBottom: 20,
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    coverPlaceholder: {
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    releaseTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: COLORS.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    artistName: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.accent,
      marginBottom: 6,
    },
    releaseMeta: {
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    playAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.accent,
      paddingHorizontal: 28,
      paddingVertical: 13,
      borderRadius: 50,
      gap: 8,
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    playAllText: {
      fontSize: 15,
      fontWeight: '700',
      color: COLORS.bg,
    },
    shuffleBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shuffleBtnActive: {
      backgroundColor: COLORS.accent,
    },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{t('common.loading')}</Text>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{t('common.error')}</Text>
        </View>
      )}

      {release && (
        <FlatList
          data={release.tracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Cover + info */}
              <View style={styles.releaseHeader}>
                {release.coverAssetUrl ? (
                  <Image
                    source={{ uri: release.coverAssetUrl }}
                    style={styles.cover}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Ionicons name="disc" size={60} color={COLORS.textMuted} />
                  </View>
                )}

                <Text style={styles.releaseTitle}>{release.title}</Text>

                {/* Artist link */}
                <TouchableOpacity
                  onPress={() => router.push(`/artist/${release.artist.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.artistName}>{release.artist.name}</Text>
                </TouchableOpacity>

                <Text style={styles.releaseMeta}>
                  {RELEASE_TYPE_LABELS[release.releaseType] ?? release.releaseType}
                  {release.releaseDate
                    ? ` · ${new Date(release.releaseDate).getFullYear()}`
                    : ''}
                  {` · ${release.tracks.length} треков`}
                  {totalDurationMs > 0 ? ` · ${formatMs(totalDurationMs)}` : ''}
                </Text>

                {/* Play all + Shuffle */}
                {release.tracks.length > 0 && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => void playTrack(release.tracks[0]!, release.tracks)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={18} color="#000" />
                      <Text style={styles.playAllText}>Воспроизвести всё</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.shuffleBtn, shuffle && styles.shuffleBtnActive]}
                      onPress={async () => {
                        if (!shuffle) await toggleShuffle();
                        void playTrack(release.tracks[0]!, release.tracks);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="shuffle" size={20} color={shuffle ? COLORS.bg : COLORS.accent} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.mutedText}>Нет треков</Text>
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
                onPress={() => void playTrack(item, release.tracks)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

