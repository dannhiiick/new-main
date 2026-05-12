import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  GestureResponderEvent,
  Image,
  Modal,
  PanResponder,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverPlaceholder } from '../ui/CoverPlaceholder';
import { useColors } from '../../hooks/useColors';
import { apiDelete, apiPost, apiGet } from '../../lib/api';
import type { LikedStatusResponse, LyricsResponse } from '../../lib/types';
import { downloadTrack, removeDownload } from '../../lib/downloader';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import { calcProgress, formatMs, usePlayerStore, RepeatMode } from '../../store/player';
import { useOfflineStore } from '../../store/offline';
import { QueueSheet } from './QueueSheet';
import { PressableScale } from '../ui/PressableScale';

const { width: SCREEN_W } = Dimensions.get('window');
const SEEK_BAR_PADDING = 32;
const SEEK_BAR_WIDTH = SCREEN_W - SEEK_BAR_PADDING * 2;

function seededHeights(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Array.from({ length: count }, () => {
    h = (h * 1664525 + 1013904223) | 0;
    return 0.2 + (Math.abs(h) / 0x7fffffff) * 0.8;
  });
}

function WaveformBars({ progress, trackId, accent, dim }: {
  progress: number; trackId: string; accent: string; dim: string;
}) {
  const BARS = 54;
  const heights = seededHeights(trackId, BARS);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 2 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(6, h * 40),
            backgroundColor: i / BARS <= progress ? accent : dim,
            borderRadius: 1.5,
          }}
        />
      ))}
    </View>
  );
}

interface FullPlayerProps {
  visible: boolean;
  onClose: () => void;
}

export function FullPlayer({ visible, onClose }: FullPlayerProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const COLORS = useColors();
  const {
    currentTrack, isPlaying, isLoading,
    shuffle, repeatMode,
    pauseResume, seekTo, playNext, playPrev, toggleShuffle, toggleRepeat,
  } = usePlayerStore();

  const { position: nativePosition, duration: nativeDuration } = useProgress(250);
  const positionMs = Math.round(nativePosition * 1000);
  const durationMs = nativeDuration > 0 ? Math.round(nativeDuration * 1000) : (currentTrack?.durationMs ?? 0);

  const offlineEntry = useOfflineStore(s =>
    currentTrack ? s.entries[currentTrack.id] : undefined,
  );
  const isDownloaded = offlineEntry?.state === 'done';
  const isDownloading = offlineEntry?.state === 'downloading';

  const handleDownloadToggle = () => {
    if (!currentTrack) return;
    if (isDownloaded) void removeDownload(currentTrack.id);
    else if (!isDownloading) void downloadTrack(currentTrack);
  };

  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
  type Speed = typeof SPEEDS[number];
  const [speed, setSpeed] = useState<Speed>(1);
  const cycleSpeed = async () => {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] as Speed;
    setSpeed(next);
    await TrackPlayer.setRate(next);
  };

  const lyricsQuery = useQuery({
    queryKey: ['lyrics', currentTrack?.id],
    queryFn: () => apiGet<LyricsResponse>(`/api/v1/lyrics/${currentTrack!.id}`),
    enabled: showLyrics && currentTrack != null,
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
  const seekBarRef = useRef<View>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const progress = calcProgress(positionMs, durationMs);
  const displayProgress = isSeeking ? seekPosition : progress;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsSeeking(true);
        setSeekPosition(Math.max(0, Math.min(1, evt.nativeEvent.locationX / SEEK_BAR_WIDTH)));
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        setSeekPosition(Math.max(0, Math.min(1, evt.nativeEvent.locationX / SEEK_BAR_WIDTH)));
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / SEEK_BAR_WIDTH));
        setIsSeeking(false);
        if (durationMs > 0) void seekTo(Math.round(ratio * durationMs));
      },
      onPanResponderTerminate: () => { setIsSeeking(false); },
    }),
  ).current;

  const { data: likeData } = useQuery({
    queryKey: ['liked-status', currentTrack?.id],
    queryFn: () => apiGet<LikedStatusResponse>(`/api/v1/library/liked/${currentTrack!.id}`),
    enabled: !!currentTrack,
  });

  const likeMutation = useMutation({
    mutationFn: () => apiPost('/api/v1/library/like', { trackId: currentTrack?.id }),
    onMutate: () => {
      qc.setQueryData(['liked-status', currentTrack?.id], { liked: true });
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['liked-status', currentTrack?.id] });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library-liked'] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => apiDelete(`/api/v1/library/like/${currentTrack?.id}`),
    onMutate: () => {
      qc.setQueryData(['liked-status', currentTrack?.id], { liked: false });
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['liked-status', currentTrack?.id] });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library-liked'] });
    },
  });

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
      paddingHorizontal: SEEK_BAR_PADDING,
      overflow: 'hidden',
    },
    bgGlow1: {
      position: 'absolute',
      top: -60,
      left: -60,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: COLORS.accent,
      opacity: 0.10,
    },
    bgGlow2: {
      position: 'absolute',
      bottom: 80,
      right: -80,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: COLORS.accentGlow,
      opacity: 0.18,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
      paddingBottom: 16,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: COLORS.surfaceGlass,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    headerCenter: { alignItems: 'center' },
    headerLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },
    headerSub: {
      fontSize: 11,
      color: COLORS.accent,
      marginTop: 2,
    },
    coverContainer: {
      alignItems: 'center',
      marginBottom: 20,
      position: 'relative',
    },
    coverGlow: {
      position: 'absolute',
      width: SCREEN_W - 80,
      height: SCREEN_W - 80,
      borderRadius: 28,
      backgroundColor: COLORS.accent,
      opacity: 0.15,
      transform: [{ scale: 1.08 }],
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: 50,
    },
    cover: {
      width: SCREEN_W - 64,
      height: SCREEN_W - 64,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.4,
      shadowRadius: 30,
      elevation: 16,
    },
    coverPlaceholder: {
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trackInfo: {
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    trackTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: COLORS.textPrimary,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    artistName: {
      fontSize: 15,
      color: COLORS.textSecondary,
      marginTop: 5,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    actionBtn: {
      alignItems: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    actionLabel: {
      fontSize: 10,
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    seekSection: { marginBottom: 20 },
    waveformWrap: {
      height: 44,
      marginVertical: 8,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    timeText: {
      fontSize: 11,
      color: COLORS.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 16,
    },
    controlBtn: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sideBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtn: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.6,
      shadowRadius: 24,
      elevation: 14,
    },
  }), [COLORS]);

  const lyricsStyles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: { fontSize: 16, fontWeight: '700', color: '#F5F5F7', flex: 1, textAlign: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    noLyrics: { fontSize: 15, color: COLORS.textMuted },
    lyricsScroll: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },
    line: {
      fontSize: 18,
      lineHeight: 30,
      color: COLORS.textMuted,
      marginVertical: 4,
      textAlign: 'center',
    },
    lineActive: {
      color: '#F5F5F7',
      fontWeight: '700',
      fontSize: 20,
    },
  }), [COLORS]);

  if (!currentTrack) return null;

  const artistNames = currentTrack.artists.map((a) => a.name).join(', ');
  const isLiked = likeData?.liked ?? false;
  const displayPositionMs = isSeeking ? Math.round(seekPosition * durationMs) : positionMs;
  const remainingMs = Math.max(0, durationMs - displayPositionMs);

  const handleLikeToggle = () => {
    if (!currentTrack) return;
    if (isLiked) unlikeMutation.mutate();
    else likeMutation.mutate();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Accent glow background */}
        <View style={styles.bgGlow1} pointerEvents="none" />
        <View style={styles.bgGlow2} pointerEvents="none" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <View style={styles.headerBtn}>
              <Ionicons name="chevron-down" size={22} color={COLORS.textPrimary} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>{t('player.now_playing')}</Text>
            {currentTrack.isLocal && (
              <Text style={styles.headerSub}>🇰🇿 Qazaqstan</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              void Share.share({
                message: `${currentTrack.title} — ${artistNames} | MoodStream KZ`,
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.headerBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textPrimary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Album cover */}
        <View style={styles.coverContainer}>
          <View style={styles.coverGlow} />
          {currentTrack.coverUrl ? (
            <Image source={{ uri: currentTrack.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <CoverPlaceholder
              artistName={currentTrack.artists[0]?.name ?? '?'}
              isLocal={currentTrack.isLocal}
              size={SCREEN_W - 64}
              borderRadius={24}
            />
          )}
        </View>

        {/* Track info — centered */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <TouchableOpacity
            onPress={() => {
              if (currentTrack.artists[0]) {
                onClose();
                router.push(`/artist/${currentTrack.artists[0].id}`);
              }
            }}
          >
            <Text style={styles.artistName} numberOfLines={1}>{artistNames}</Text>
          </TouchableOpacity>
        </View>

        {/* Actions row: like | download | queue | lyrics */}
        <View style={styles.actionsRow}>
          <PressableScale style={styles.actionBtn} onPress={handleLikeToggle} haptic="medium" scaleDown={0.80}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? COLORS.coral : COLORS.textSecondary}
            />
            <Text style={styles.actionLabel}>Лайк</Text>
          </PressableScale>
          <PressableScale style={styles.actionBtn} onPress={handleDownloadToggle} haptic="light" scaleDown={0.80}>
            <Ionicons
              name={isDownloaded ? 'arrow-down-circle' : isDownloading ? 'hourglass-outline' : 'arrow-down-circle-outline'}
              size={24}
              color={isDownloaded || isDownloading ? COLORS.turquoise : COLORS.textSecondary}
            />
            <Text style={styles.actionLabel}>Офлайн</Text>
          </PressableScale>
          <PressableScale style={styles.actionBtn} onPress={() => setShowQueue(true)} haptic="light" scaleDown={0.80}>
            <Ionicons name="list-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.actionLabel}>{t('player.queue')}</Text>
          </PressableScale>
          <PressableScale style={styles.actionBtn} onPress={() => setShowLyrics(true)} haptic="light" scaleDown={0.80}>
            <Ionicons name="text-outline" size={24} color={COLORS.textSecondary} />
            <Text style={styles.actionLabel}>Слова</Text>
          </PressableScale>
          <PressableScale style={styles.actionBtn} onPress={() => void cycleSpeed()} haptic="light" scaleDown={0.80}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: speed !== 1 ? COLORS.accent : COLORS.textSecondary, height: 24, lineHeight: 24 }}>
              {speed}×
            </Text>
            <Text style={styles.actionLabel}>Скорость</Text>
          </PressableScale>
        </View>

        {/* Waveform scrubber */}
        <View style={styles.seekSection}>
          <View ref={seekBarRef} style={styles.waveformWrap} {...panResponder.panHandlers}>
            <WaveformBars
              progress={displayProgress}
              trackId={currentTrack.id}
              accent={COLORS.accent}
              dim={COLORS.border}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatMs(displayPositionMs)}</Text>
            <Text style={styles.timeText}>-{formatMs(remainingMs)}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <PressableScale
            style={styles.sideBtn}
            onPress={() => void toggleShuffle()}
            haptic="light"
            scaleDown={0.82}
          >
            <Ionicons
              name={shuffle ? 'shuffle' : 'shuffle-outline'}
              size={22}
              color={shuffle ? COLORS.accent : COLORS.textSecondary}
            />
          </PressableScale>

          <PressableScale style={styles.controlBtn} onPress={() => void playPrev()} haptic="light" scaleDown={0.85}>
            <Ionicons name="play-skip-back" size={30} color={COLORS.textPrimary} />
          </PressableScale>

          <PressableScale style={styles.playBtn} onPress={() => void pauseResume()} haptic="medium" scaleDown={0.90}>
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.bg} />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={COLORS.bg} />
            )}
          </PressableScale>

          <PressableScale style={styles.controlBtn} onPress={() => void playNext()} haptic="light" scaleDown={0.85}>
            <Ionicons name="play-skip-forward" size={30} color={COLORS.textPrimary} />
          </PressableScale>

          <PressableScale
            style={styles.sideBtn}
            onPress={() => void toggleRepeat()}
            haptic="light"
            scaleDown={0.82}
          >
            <Ionicons
              name={
                repeatMode === RepeatMode.Track ? 'infinite'
                  : repeatMode === RepeatMode.Queue ? 'repeat'
                    : 'repeat-outline'
              }
              size={22}
              color={repeatMode !== RepeatMode.Off ? COLORS.accent : COLORS.textSecondary}
            />
          </PressableScale>
        </View>
      </SafeAreaView>

      <QueueSheet visible={showQueue} onClose={() => setShowQueue(false)} />

      {/* Lyrics Sheet */}
      <Modal visible={showLyrics} animationType="slide" onRequestClose={() => setShowLyrics(false)}>
        <SafeAreaView style={lyricsStyles.container}>
          <View style={lyricsStyles.header}>
            <TouchableOpacity onPress={() => setShowLyrics(false)}>
              <Ionicons name="chevron-down" size={24} color="#F5F5F7" />
            </TouchableOpacity>
            <Text style={lyricsStyles.title} numberOfLines={1}>
              {currentTrack?.title ?? 'Слова'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          {lyricsQuery.isLoading && (
            <View style={lyricsStyles.center}>
              <ActivityIndicator color={COLORS.accent} />
            </View>
          )}
          {!lyricsQuery.isLoading && (lyricsQuery.data?.lines.length ?? 0) === 0 && (
            <View style={lyricsStyles.center}>
              <Ionicons name="musical-note-outline" size={40} color={COLORS.textMuted} />
              <Text style={lyricsStyles.noLyrics}>Слова не найдены</Text>
            </View>
          )}
          {(lyricsQuery.data?.lines.length ?? 0) > 0 && (
            <View style={lyricsStyles.lyricsScroll}>
              {lyricsQuery.data!.lines.map((line, i) => {
                const isActive = lyricsQuery.data!.synced &&
                  i < lyricsQuery.data!.lines.length - 1
                    ? positionMs >= line.timeMs && positionMs < lyricsQuery.data!.lines[i + 1]!.timeMs
                    : positionMs >= line.timeMs;
                return (
                  <Text
                    key={i}
                    style={[lyricsStyles.line, isActive && lyricsStyles.lineActive]}
                  >
                    {line.text || ' '}
                  </Text>
                );
              })}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}
