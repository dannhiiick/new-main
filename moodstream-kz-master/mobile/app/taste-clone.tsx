import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../hooks/useColors';
import { apiDelete, apiGet, apiPost } from '../lib/api';

interface PublicProfileItem {
  id: string;
  displayName: string;
  bio: string | null;
  genreTags: string[];
}

interface CloneSession {
  id: string;
  sourceProfile: { id: string; displayName: string; genreTags: string[] };
  startedAt: string;
}

const GENRE_LABEL: Record<string, string> = {
  pop: 'Поп', rock: 'Рок', jazz: 'Джаз', 'hip-hop': 'Хип-хоп',
  electronic: 'Электроника', classical: 'Классика', folk: 'Народная',
};
function gl(s: string) { return GENRE_LABEL[s.toLowerCase()] ?? s; }

function ProfileCard({
  profile,
  onClone,
  isActive,
}: {
  profile: PublicProfileItem;
  onClone: () => void;
  isActive: boolean;
}) {
  const COLORS = useColors();
  const cardStyles = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 4 },
    name: { fontSize: 15, fontWeight: '700', color: '#F5F5F7' },
    bio: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    tag: {
      backgroundColor: 'rgba(200,123,78,0.15)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagText: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: COLORS.surfaceElevated,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    btnActive: { backgroundColor: 'rgba(200,123,78,0.2)', borderColor: COLORS.accent },
    btnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
    btnTextActive: { color: COLORS.accent },
  }), [COLORS]);
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.avatar}>
        <Ionicons name="person" size={20} color={COLORS.textMuted} />
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{profile.displayName}</Text>
        {profile.bio && <Text style={cardStyles.bio} numberOfLines={2}>{profile.bio}</Text>}
        <View style={cardStyles.tags}>
          {profile.genreTags.slice(0, 3).map((g) => (
            <View key={g} style={cardStyles.tag}>
              <Text style={cardStyles.tagText}>{gl(g)}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity
        style={[cardStyles.btn, isActive && cardStyles.btnActive]}
        onPress={onClone}
      >
        <Text style={[cardStyles.btnText, isActive && cardStyles.btnTextActive]}>
          {isActive ? 'Активен' : 'Войти'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TasteCloneScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ['clone-profiles'],
    queryFn: () => apiGet<{ items: PublicProfileItem[] }>('/api/v1/taste-clone/profiles'),
    staleTime: 5 * 60 * 1000,
  });

  const activeQuery = useQuery({
    queryKey: ['clone-active'],
    queryFn: () => apiGet<CloneSession>('/api/v1/taste-clone/sessions/active'),
    retry: false,
    staleTime: 60_000,
  });

  const startMutation = useMutation({
    mutationFn: (sourceProfileId: string) =>
      apiPost('/api/v1/taste-clone/sessions', { sourceProfileId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clone-active'] });
      Alert.alert('Клон активен', 'Рекомендации теперь основаны на вкусе этого пользователя');
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось запустить клон'),
  });

  const endMutation = useMutation({
    mutationFn: () => apiDelete('/api/v1/taste-clone/sessions/active'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clone-active'] });
      Alert.alert('Клон завершён', 'Вернулись к вашим рекомендациям');
    },
  });

  const activeSession = activeQuery.data;
  const profiles = profilesQuery.data?.items ?? [];

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
    activeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      padding: 14,
      backgroundColor: 'rgba(200,123,78,0.12)',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(200,123,78,0.3)',
      gap: 12,
    },
    bannerLabel: { fontSize: 11, color: COLORS.accent, fontWeight: '700', marginBottom: 3 },
    bannerName: { fontSize: 15, fontWeight: '700', color: '#F5F5F7' },
    endBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: 'rgba(200,123,78,0.2)',
      borderWidth: 1,
      borderColor: COLORS.accent,
    },
    endBtnText: { fontSize: 13, color: COLORS.accent, fontWeight: '700' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60 },
    emptyText: { fontSize: 16, color: COLORS.textMuted },
    emptyHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  }), [COLORS]);

  const handleClone = (profileId: string) => {
    if (activeSession) {
      Alert.alert(
        'Сменить клон?',
        'Сначала завершим текущую сессию',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Завершить и войти',
            onPress: () => {
              endMutation.mutate(undefined, {
                onSuccess: () => startMutation.mutate(profileId),
              });
            },
          },
        ],
      );
    } else {
      startMutation.mutate(profileId);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#F5F5F7" />
        </TouchableOpacity>
        <Text style={styles.title}>Клон вкуса</Text>
        <View style={{ width: 24 }} />
      </View>

      {activeSession && (
        <View style={styles.activeBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLabel}>Активный клон</Text>
            <Text style={styles.bannerName}>{activeSession.sourceProfile.displayName}</Text>
          </View>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => endMutation.mutate()}
          >
            <Text style={styles.endBtnText}>Завершить</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={profiles}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            isActive={activeSession?.sourceProfile.id === item.id}
            onClone={() => handleClone(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Нет публичных профилей</Text>
            <Text style={styles.emptyHint}>Пока никто не открыл свой вкус</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

