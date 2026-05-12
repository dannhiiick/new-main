import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColors } from '../../hooks/useColors';
import type { FeedbackKind, TrackSummary } from '../../lib/types';
import { useOfflineStore } from '../../store/offline';
import { usePlayerStore } from '../../store/player';
import { TrackContextMenu } from './TrackContextMenu';
import { CoverPlaceholder } from '../ui/CoverPlaceholder';

interface TrackRowProps {
  track: TrackSummary;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  index?: number;
  onPress: () => void;
  onLike?: () => void;
  liked?: boolean;
  onFeedback?: (kind: FeedbackKind) => void;
  releaseId?: string;
}

function PlayingBars({ isPlaying }: { isPlaying: boolean }) {
  const COLORS = useColors();
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.7)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!isPlaying) {
      bar1.setValue(0.3);
      bar2.setValue(0.7);
      bar3.setValue(0.5);
      return;
    }
    const makeAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 300 + delay, useNativeDriver: false }),
          Animated.timing(val, { toValue: 0.2, duration: 300 + delay, useNativeDriver: false }),
        ]),
      );
    const a1 = makeAnim(bar1, 0);
    const a2 = makeAnim(bar2, 150);
    const a3 = makeAnim(bar3, 80);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [isPlaying, bar1, bar2, bar3]);

  const barStyles = useMemo(() => StyleSheet.create({
    container: { width: 18, height: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
    bar: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 1 },
  }), [COLORS]);

  return (
    <View style={barStyles.container}>
      {[bar1, bar2, bar3].map((val, i) => (
        <Animated.View
          key={i}
          style={[barStyles.bar, {
            height: val.interpolate({ inputRange: [0, 1], outputRange: ['20%', '100%'] }),
          }]}
        />
      ))}
    </View>
  );
}

export const TrackRow = memo(function TrackRow({
  track,
  isActive,
  isPlaying,
  isLoading,
  index,
  onPress,
  onLike,
  liked,
  onFeedback,
  releaseId,
}: TrackRowProps) {
  const COLORS = useColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const isOffline = useOfflineStore(s => s.isDownloaded(track.id));

  const isPlayable = track.playbackStatus === 'PLAYABLE';
  const artistNames = track.artists.map((a) => a.name).join(', ');

  const formatDuration = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = (): string | null => {
    if (track.playbackStatus === 'BLOCKED') return 'Недоступно';
    if (track.playbackStatus === 'PROCESSING') return 'Обрабатывается';
    return null;
  };

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: COLORS.surfaceGlass,
      borderRadius: 20,
      marginHorizontal: 16,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: COLORS.borderSubtle,
    },
    rowActive: {
      backgroundColor: COLORS.accentDim,
      borderColor: COLORS.border,
    },
    rowDisabled: {
      opacity: 0.45,
    },
    coverContainer: {
      position: 'relative',
      marginRight: 12,
    },
    cover: {
      width: 60,
      height: 60,
      borderRadius: 8,
    },
    coverPlaceholder: {
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverOverlay: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    offlineDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: COLORS.bg,
      borderRadius: 8,
    },
    info: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    explicitBadge: {
      backgroundColor: COLORS.textMuted,
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    explicitText: { fontSize: 9, fontWeight: '700', color: COLORS.bg },
    trackTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textPrimary,
    },
    trackTitleActive: { color: COLORS.accentLight },
    trackTitleMuted: { color: COLORS.textMuted },
    artistName: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 8,
    },
    indexText: {
      fontSize: 12,
      color: COLORS.textMuted,
      minWidth: 16,
      textAlign: 'right',
    },
    duration: {
      fontSize: 12,
      color: COLORS.textMuted,
      minWidth: 36,
      textAlign: 'right',
    },
  }), [COLORS]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.row,
          isActive && styles.rowActive,
          !isPlayable && styles.rowDisabled,
        ]}
        onPress={isPlayable ? onPress : undefined}
        onLongPress={isPlayable ? () => setMenuVisible(true) : undefined}
        delayLongPress={350}
        activeOpacity={isPlayable ? 0.75 : 1}
      >
        {/* Cover */}
        <View style={styles.coverContainer}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <CoverPlaceholder
              artistName={track.artists[0]?.name ?? '?'}
              isLocal={track.isLocal}
              size={48}
              borderRadius={8}
            />
          )}
          {isActive && !isLoading && (
            <View style={styles.coverOverlay}>
              <PlayingBars isPlaying={isPlaying} />
            </View>
          )}
          {isActive && isLoading && (
            <View style={styles.coverOverlay}>
              <Ionicons name="hourglass" size={14} color={COLORS.accent} />
            </View>
          )}
          {!isPlayable && (
            <View style={styles.coverOverlay}>
              <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
            </View>
          )}
          {isOffline && (
            <View style={styles.offlineDot}>
              <Ionicons name="arrow-down-circle" size={13} color={COLORS.turquoise} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.trackTitle,
                isActive && styles.trackTitleActive,
                !isPlayable && styles.trackTitleMuted,
              ]}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            {track.isExplicit && (
              <View style={styles.explicitBadge}>
                <Text style={styles.explicitText}>E</Text>
              </View>
            )}
          </View>
          <Text style={styles.artistName} numberOfLines={1}>
            {getStatusLabel() ?? artistNames}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.right}>
          {onLike && (
            <TouchableOpacity onPress={onLike} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? COLORS.coral : COLORS.textMuted}
              />
            </TouchableOpacity>
          )}
          {!onLike && index !== undefined && (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
          <Text style={styles.duration}>{formatDuration(track.durationMs)}</Text>
          {isPlayable && (
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      <TrackContextMenu
        track={track}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        liked={liked}
        onLike={onLike}
        onFeedback={onFeedback}
        releaseId={releaseId}
      />
    </>
  );
});
