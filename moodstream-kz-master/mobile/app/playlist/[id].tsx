import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrackRow } from '../../components/track/TrackRow';
import { useColors } from '../../hooks/useColors';
import { apiGet } from '../../lib/api';
import type { PlaylistDetail, TrackSummary } from '../../lib/types';
import { usePlayerStore } from '../../store/player';

function playlistTrackToSummary(pt: PlaylistDetail['tracks'][number]): TrackSummary {
  return {
    id: pt.track.id,
    title: pt.track.title,
    durationMs: pt.track.duration,
    artists: pt.track.artists.map((a) => ({
      id: a.artist.id,
      name: a.artist.name,
      slug: '',
    })),
    coverUrl: null,
    playbackStatus: 'PLAYABLE',
    offlineEligible: false,
    isLocal: false,
    isExplicit: false,
  };
}

export default function PlaylistScreen() {
  const COLORS = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { currentTrack, isPlaying, isLoading: playerLoading, playTrack } = usePlayerStore();

  const { data: playlist, isLoading, isError } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => apiGet<PlaylistDetail>(`/api/v1/playlists/${id ?? ''}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const trackSummaries: TrackSummary[] = playlist?.tracks.map(playlistTrackToSummary) ?? [];

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 8,
      gap: 12,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      color: COLORS.textPrimary,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    mutedText: { fontSize: 14, color: COLORS.textMuted },
    listContent: { paddingBottom: 120 },
    playlistHeader: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    coverPlaceholder: {
      width: 200,
      height: 200,
      borderRadius: 20,
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    playlistTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: COLORS.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    playlistDescription: {
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: 6,
    },
    playlistMeta: {
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
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
        {playlist && (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {playlist.title}
          </Text>
        )}
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

      {playlist && (
        <FlatList
          data={playlist.tracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.playlistHeader}>
              <View style={styles.coverPlaceholder}>
                <Ionicons name="musical-notes" size={48} color={COLORS.textMuted} />
              </View>
              <Text style={styles.playlistTitle}>{playlist.title}</Text>
              {playlist.description ? (
                <Text style={styles.playlistDescription}>{playlist.description}</Text>
              ) : null}
              <Text style={styles.playlistMeta}>
                {`${playlist.tracks.length} треков`}
              </Text>
              {trackSummaries.length > 0 && (
                <TouchableOpacity
                  style={styles.playAllBtn}
                  onPress={() => void playTrack(trackSummaries[0]!, trackSummaries)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={18} color="#000" />
                  <Text style={styles.playAllText}>Воспроизвести всё</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.mutedText}>Нет треков</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const summary = playlistTrackToSummary(item);
            const isActive = currentTrack?.id === summary.id;
            return (
              <TrackRow
                track={summary}
                isActive={isActive}
                isPlaying={isActive && isPlaying}
                isLoading={isActive && playerLoading}
                index={index}
                onPress={() => void playTrack(summary, trackSummaries)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

