import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../hooks/useColors';
import { apiDelete, apiGet, apiPost } from '../../lib/api';
import type { ArtistDetail } from '../../lib/types';

const RELEASE_TYPE_LABELS: Record<string, string> = {
  ALBUM: 'Альбом',
  SINGLE: 'Сингл',
  EP: 'EP',
  COMPILATION: 'Сборник',
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M подписчиков`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K подписчиков`;
  return `${n} подписчиков`;
}

export default function ArtistScreen() {
  const COLORS = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: artist, isLoading, isError } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => apiGet<ArtistDetail>(`/api/v1/catalog/artists/${id ?? ''}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  });

  const { data: followStatus } = useQuery<{ following: boolean }>({
    queryKey: ['artist-follow', id],
    queryFn: () => apiGet(`/api/v1/social/artists/${id ?? ''}/follow`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });

  const followMutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/social/artists/${id ?? ''}/follow`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['artist-follow', id] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiDelete(`/api/v1/social/artists/${id ?? ''}/follow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['artist-follow', id] }),
  });

  const isFollowing = followStatus?.following ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    mutedText: { fontSize: 14, color: COLORS.textMuted },
    listContent: { paddingBottom: 120 },
    artistHeader: { paddingHorizontal: 24, paddingBottom: 8, alignItems: 'center' },
    avatar: { width: 130, height: 130, borderRadius: 65, marginBottom: 16 },
    avatarPlaceholder: {
      backgroundColor: COLORS.surfaceGlass,
      borderWidth: 1, borderColor: COLORS.border,
      alignItems: 'center', justifyContent: 'center',
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    artistName: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
    badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    badge: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
      borderWidth: 1, borderColor: COLORS.border,
    },
    badgeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
    followRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: 16, marginBottom: 16,
    },
    followerCount: { fontSize: 13, color: COLORS.textSecondary },
    followBtn: {
      paddingHorizontal: 20, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: COLORS.accent,
    },
    followBtnActive: {
      backgroundColor: COLORS.accent,
    },
    followBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
    followBtnTextActive: { color: COLORS.bg },
    bio: {
      fontSize: 13, color: COLORS.textSecondary,
      textAlign: 'center', lineHeight: 20, marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18, fontWeight: '700', color: COLORS.textPrimary,
      alignSelf: 'flex-start', marginTop: 8, marginBottom: 12,
    },
    releaseRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 10,
      marginHorizontal: 16, marginBottom: 6,
      backgroundColor: COLORS.surfaceGlass,
      borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderSubtle, gap: 12,
    },
    releaseCover: { width: 52, height: 52, borderRadius: 10 },
    releaseCoverPlaceholder: {
      backgroundColor: COLORS.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    releaseInfo: { flex: 1 },
    releaseTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
    releaseMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  }), [COLORS]);

  const handleFollowToggle = () => {
    if (isFollowing) unfollowMutation.mutate();
    else followMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Загрузка...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.mutedText}>Ошибка загрузки</Text>
        </View>
      )}

      {artist && (
        <FlatList
          data={artist.releases}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.artistHeader}>
              {artist.coverUrl ? (
                <Image source={{ uri: artist.coverUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={52} color={COLORS.textMuted} />
                </View>
              )}

              <View style={styles.nameRow}>
                <Text style={styles.artistName}>{artist.name}</Text>
                {artist.isVerified && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
                )}
              </View>

              <View style={styles.badges}>
                {artist.isLocal && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>🇰🇿 KZ</Text>
                  </View>
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{artist.type}</Text>
                </View>
              </View>

              {/* Followers + Follow button */}
              <View style={styles.followRow}>
                <Text style={styles.followerCount}>
                  {formatFollowers(artist.followerCount)}
                </Text>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                  onPress={handleFollowToggle}
                  disabled={isPending}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                    {isFollowing ? 'Вы подписаны' : 'Подписаться'}
                  </Text>
                </TouchableOpacity>
              </View>

              {artist.bio ? (
                <Text style={styles.bio} numberOfLines={4}>{artist.bio}</Text>
              ) : null}

              {artist.releases.length > 0 && (
                <Text style={styles.sectionTitle}>Дискография</Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.mutedText}>Нет релизов</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.releaseRow}
              onPress={() => router.push(`/album/${item.id}`)}
              activeOpacity={0.7}
            >
              {item.coverAssetUrl ? (
                <Image source={{ uri: item.coverAssetUrl }} style={styles.releaseCover} resizeMode="cover" />
              ) : (
                <View style={[styles.releaseCover, styles.releaseCoverPlaceholder]}>
                  <Ionicons name="disc" size={24} color={COLORS.textMuted} />
                </View>
              )}
              <View style={styles.releaseInfo}>
                <Text style={styles.releaseTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.releaseMeta}>
                  {RELEASE_TYPE_LABELS[item.releaseType] ?? item.releaseType}
                  {item.releaseDate ? ` · ${new Date(item.releaseDate).getFullYear()}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

