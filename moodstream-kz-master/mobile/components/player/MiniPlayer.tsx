import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColors } from '../../hooks/useColors';
import { calcProgress, usePlayerStore } from '../../store/player';
import { PressableScale } from '../ui/PressableScale';

interface MiniPlayerProps {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { t } = useTranslation();
  const COLORS = useColors();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    positionMs,
    durationMs,
    pauseResume,
    playNext,
  } = usePlayerStore();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: '#1E1428',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },
    progressTrack: {
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    progressFill: {
      height: 2,
      backgroundColor: COLORS.accent,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 12,
    },
    cover: {
      width: 46,
      height: 46,
      borderRadius: 10,
    },
    coverPlaceholder: {
      backgroundColor: 'rgba(200,123,78,0.20)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1 },
    trackTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#F5F5F7',
    },
    artistName: {
      fontSize: 12,
      color: 'rgba(245,245,247,0.55)',
      marginTop: 1,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlBtnSm: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }), [COLORS]);

  if (!currentTrack) return null;

  const progress = calcProgress(positionMs, durationMs);
  const artistNames = currentTrack.artists.map((a) => a.name).join(', ');

  return (
    <TouchableOpacity style={styles.container} onPress={onExpand} activeOpacity={0.95}>
      {/* Progress bar at top */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.body}>
        {/* Cover */}
        {currentTrack.coverUrl ? (
          <Image source={{ uri: currentTrack.coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Ionicons name="musical-note" size={16} color="rgba(255,255,255,0.5)" />
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.trackTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {artistNames || t('player.now_playing')}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <PressableScale
            style={styles.playBtn}
            onPress={() => void pauseResume()}
            haptic="medium"
            scaleDown={0.88}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={COLORS.bg}
              />
            )}
          </PressableScale>

          <PressableScale
            style={styles.controlBtnSm}
            onPress={() => void playNext()}
            haptic="light"
            scaleDown={0.82}
          >
            <Ionicons name="play-skip-forward" size={20} color="rgba(255,255,255,0.7)" />
          </PressableScale>
        </View>
      </View>
    </TouchableOpacity>
  );
}
