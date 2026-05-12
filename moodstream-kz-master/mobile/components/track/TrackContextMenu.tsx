import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useEffect, useMemo } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
} from 'react-native';

import { useColors } from '../../hooks/useColors';
import { apiGet, apiPost } from '../../lib/api';
import type { FeedbackKind, PlaylistListPage, TrackSummary } from '../../lib/types';
import { usePlayerStore } from '../../store/player';
import { CoverPlaceholder } from '../ui/CoverPlaceholder';

interface Props {
  track: TrackSummary;
  visible: boolean;
  onClose: () => void;
  liked?: boolean;
  onLike?: () => void;
  onFeedback?: (kind: FeedbackKind) => void;
  releaseId?: string;
}

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}

export function TrackContextMenu({ track, visible, onClose, liked, onLike, onFeedback, releaseId }: Props) {
  const router = useRouter();
  const COLORS = useColors();
  const addToQueue = usePlayerStore(s => s.addToQueue);
  const queue = usePlayerStore(s => s.queue);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 14,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible, slideAnim]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  };

  const handleAddToPlaylist = async () => {
    close();
    try {
      const page = await apiGet<PlaylistListPage>('/api/v1/playlists');
      if (!page.items.length) {
        Alert.alert('Плейлисты', 'Сначала создайте плейлист в Медиатеке');
        return;
      }
      Alert.alert(
        'Добавить в плейлист',
        undefined,
        [
          ...page.items.map(pl => ({
            text: pl.title,
            onPress: () => void apiPost(`/api/v1/playlists/${pl.id}/tracks`, { trackId: track.id }),
          })),
          { text: 'Отмена', style: 'cancel' as const },
        ],
      );
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить плейлисты');
    }
  };

  const handleShare = async () => {
    close();
    try {
      await Share.share({
        message: `${track.title} — ${track.artists.map(a => a.name).join(', ')} | MoodStream KZ`,
      });
    } catch {
      // user cancelled share
    }
  };

  const handleFeedback = (kind: FeedbackKind) => {
    close();
    onFeedback?.(kind);
  };

  const artistNames = track.artists.map(a => a.name).join(', ');
  const firstArtist = track.artists[0];

  const menuItems: MenuItem[] = [
    {
      icon: 'share-outline',
      label: 'Поделиться',
      onPress: () => void handleShare(),
    },
    {
      icon: liked ? 'heart' : 'heart-outline',
      label: liked ? 'Убрать из любимых' : 'Добавить в любимые треки',
      color: liked ? COLORS.coral : undefined,
      onPress: () => {
        close();
        onLike?.();
      },
    },
    {
      icon: 'add-circle-outline',
      label: 'Добавить в плейлист',
      onPress: () => void handleAddToPlaylist(),
    },
    ...(queue.length > 0 ? [{
      icon: 'list-outline',
      label: 'Добавить в очередь',
      onPress: () => {
        addToQueue(track);
        close();
      },
    }] : []),
    ...(releaseId ? [{
      icon: 'disc-outline',
      label: 'Перейти к альбому',
      onPress: () => {
        close();
        router.push(`/album/${releaseId}`);
      },
    }] : []),
    ...(firstArtist ? [{
      icon: 'person-outline',
      label: 'Перейти к исполнителю',
      onPress: () => {
        close();
        router.push(`/artist/${firstArtist.id}`);
      },
    }] : []),
    ...(onFeedback ? [
      {
        icon: 'eye-off-outline',
        label: 'Не рекомендовать трек',
        onPress: () => handleFeedback('HIDE_TRACK'),
        destructive: true,
      },
      ...(firstArtist ? [{
        icon: 'person-remove-outline',
        label: 'Не рекомендовать артиста',
        onPress: () => handleFeedback('HIDE_ARTIST'),
        destructive: true,
      }] : []),
    ] as MenuItem[] : []),
  ];

  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    cover: {
      width: 52,
      height: 52,
      borderRadius: 8,
    },
    coverFallback: {
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.textPrimary,
    },
    headerArtist: {
      fontSize: 13,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    kzBadge: {
      backgroundColor: COLORS.accentDim,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    kzBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: COLORS.accent,
    },
    divider: {
      height: 0.5,
      backgroundColor: COLORS.border,
      marginHorizontal: 0,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 16,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDanger: {
      backgroundColor: 'rgba(229,123,110,0.12)',
    },
    menuLabel: {
      fontSize: 15,
      color: COLORS.textPrimary,
      flex: 1,
    },
    menuLabelDanger: {
      color: COLORS.coral,
    },
    bottomSpacer: {
      height: 32,
    },
  }), [COLORS]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Track header */}
        <View style={styles.header}>
          {track.coverUrl ? (
            <Image source={{ uri: track.coverUrl }} style={styles.cover} />
          ) : (
            <CoverPlaceholder
              artistName={track.artists[0]?.name ?? '?'}
              isLocal={track.isLocal}
              size={52}
              borderRadius={8}
            />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.headerArtist} numberOfLines={1}>{artistNames}</Text>
          </View>
          {track.isLocal && (
            <View style={styles.kzBadge}>
              <Text style={styles.kzBadgeText}>KZ</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Menu items */}
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.65}
            >
              <View style={[styles.iconWrap, item.destructive && styles.iconWrapDanger]}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.color ?? (item.destructive ? COLORS.coral : COLORS.textPrimary)}
                />
              </View>
              <Text style={[styles.menuLabel, item.destructive && styles.menuLabelDanger]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
