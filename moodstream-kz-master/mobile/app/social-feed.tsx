import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../hooks/useColors';
import { apiGet } from '../lib/api';
import type { FeedItem, SocialFeedResponse } from '../lib/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}

function releaseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    SINGLE: 'Сингл', EP: 'EP', ALBUM: 'Альбом',
    COMPILATION: 'Сборник', LIVE: 'Live',
  };
  return map[type] ?? type;
}

function FeedCard({ item }: { item: FeedItem }) {
  const COLORS = useColors();
  const cardStyles = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      gap: 14,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(200,123,78,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 4 },
    label: { fontSize: 14, color: '#F5F5F7', lineHeight: 20 },
    accent: { color: COLORS.accent, fontWeight: '700' },
    title: { fontSize: 13, color: COLORS.textMuted },
    time: { fontSize: 12, color: COLORS.textMuted },
  }), [COLORS]);
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.iconWrap}>
        <Ionicons
          name={item.type === 'NEW_RELEASE' ? 'albums-outline' : 'heart-outline'}
          size={20}
          color={COLORS.accent}
        />
      </View>
      <View style={cardStyles.body}>
        {item.type === 'NEW_RELEASE' && item.release && item.artist && (
          <>
            <Text style={cardStyles.label}>
              <Text style={cardStyles.accent}>{item.artist.name}</Text>
              {item.artist.isLocal && ' 🇰🇿'}
              {' выпустил(а) '}
              <Text style={cardStyles.accent}>{releaseTypeLabel(item.release.releaseType)}</Text>
            </Text>
            <Text style={cardStyles.title} numberOfLines={1}>{item.release.title}</Text>
          </>
        )}
        <Text style={cardStyles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function SocialFeedScreen() {
  const COLORS = useColors();
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['social-feed'],
    queryFn: () => apiGet<SocialFeedResponse>('/api/v1/social/feed'),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: { fontSize: 17, fontWeight: '700', color: '#F5F5F7' },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 32,
    },
    muted: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center' },
    hint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
    accent: { fontSize: 15, color: COLORS.accent, fontWeight: '600' },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#F5F5F7" />
        </TouchableOpacity>
        <Text style={styles.title}>Релизы друзей</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <Text style={styles.muted}>Загрузка...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <TouchableOpacity onPress={() => void refetch()}>
            <Text style={styles.accent}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.muted}>Пока пусто</Text>
          <Text style={styles.hint}>
            {data?.totalFollowedArtists === 0
              ? 'Подписывайтесь на артистов чтобы видеть их новинки'
              : 'Новых релизов нет за последние 90 дней'}
          </Text>
        </View>
      )}

      {items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeedCard item={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

