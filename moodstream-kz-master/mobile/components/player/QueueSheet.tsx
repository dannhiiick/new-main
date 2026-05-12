import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../hooks/useColors';
import { usePlayerStore } from '../../store/player';

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

interface QueueSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function QueueSheet({ visible, onClose }: QueueSheetProps) {
  const { t } = useTranslation();
  const COLORS = useColors();
  const { queue, currentIndex, currentTrack, playTrack } = usePlayerStore();

  // Only show upcoming + currently playing
  const upcoming = queue.slice(currentIndex);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: COLORS.textPrimary,
    },
    list: {
      paddingVertical: 8,
      paddingBottom: 60,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontSize: 14,
      color: COLORS.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginHorizontal: 12,
      marginBottom: 4,
      borderRadius: 16,
      gap: 12,
    },
    rowActive: {
      backgroundColor: COLORS.accentDim,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    cover: {
      width: 44,
      height: 44,
      borderRadius: 10,
    },
    coverPlaceholder: {
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1 },
    trackTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: COLORS.textPrimary,
    },
    trackTitleActive: {
      color: COLORS.accentLight,
      fontWeight: '700',
    },
    artistName: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    duration: {
      fontSize: 12,
      color: COLORS.textMuted,
      minWidth: 36,
      textAlign: 'right',
    },
  }), [COLORS]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('player.queue_title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={upcoming}
          keyExtractor={(item, idx) => `${item.id}-${idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('player.queue_empty')}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isCurrentlyPlaying = item.id === currentTrack?.id && index === 0;
            const artistNames = item.artists.map((a) => a.name).join(', ');

            return (
              <TouchableOpacity
                style={[styles.row, isCurrentlyPlaying && styles.rowActive]}
                onPress={() => {
                  void playTrack(item, queue);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                {/* Cover */}
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Ionicons name="musical-note" size={14} color={COLORS.textMuted} />
                  </View>
                )}

                {/* Info */}
                <View style={styles.info}>
                  <Text
                    style={[styles.trackTitle, isCurrentlyPlaying && styles.trackTitleActive]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.artistName} numberOfLines={1}>
                    {artistNames}
                  </Text>
                </View>

                {/* Duration + playing indicator */}
                <View style={styles.right}>
                  {isCurrentlyPlaying && (
                    <Ionicons name="musical-notes" size={14} color={COLORS.accent} />
                  )}
                  <Text style={styles.duration}>{formatMs(item.durationMs)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
