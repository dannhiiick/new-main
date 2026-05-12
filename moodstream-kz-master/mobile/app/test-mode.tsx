import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../hooks/useColors';
import { apiGet, apiPost } from '../lib/api';
import type { TestSession, TestSessionEnded } from '../lib/types';

const ONBOARDING_KEY = 'test_mode_onboarding_shown';

export default function TestModeScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [onboardingShown, setOnboardingShown] = useState<boolean | null>(null);

  const { data: session, isLoading } = useQuery<TestSession | null>({
    queryKey: ['test-session'],
    queryFn: async () => {
      try {
        return await apiGet<TestSession>('/api/v1/test-mode/current');
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    void SecureStore.getItemAsync(ONBOARDING_KEY).then(val => {
      setOnboardingShown(val === 'true');
    });
  }, []);

  const startMutation = useMutation({
    mutationFn: () => apiPost<TestSession>('/api/v1/test-mode/start', {}),
    onSuccess: async () => {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
      setOnboardingShown(true);
      qc.invalidateQueries({ queryKey: ['test-session'] });
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось запустить тест-режим'),
  });

  const endMutation = useMutation({
    mutationFn: (action: 'keep' | 'discard') =>
      apiPost<TestSessionEnded>('/api/v1/test-mode/end', { action }),
    onSuccess: (data, action) => {
      qc.invalidateQueries({ queryKey: ['test-session'] });
      if (action === 'keep') {
        Alert.alert('Готово', `Перенесено ${data.transferred} треков в основной профиль`);
      } else {
        Alert.alert('Готово', 'Сессия удалена без следа');
      }
    },
    onError: () => Alert.alert('Ошибка', 'Не удалось завершить сессию'),
  });

  const handleEnd = (action: 'keep' | 'discard') => {
    const msg = action === 'keep'
      ? 'Перенести понравившиеся треки в основной профиль?'
      : 'Удалить сессию без следа? Все лайки будут потеряны.';
    Alert.alert('Завершить тест-режим', msg, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Да', onPress: () => endMutation.mutate(action) },
    ]);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    title: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
    content: { flex: 1 },
    contentInner: { padding: 24 },
    hint: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
    activeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.accentDim, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center', marginBottom: 24,
    },
    activeBadgeText: { color: COLORS.accent, fontWeight: '600' },
    statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 32 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 32, fontWeight: '700', color: COLORS.textPrimary },
    statLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
    quickStart: { alignItems: 'center', paddingTop: 60, gap: 8 },
    iconWrap: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
    heading: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 },
    description: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    featureList: { gap: 12, marginBottom: 32 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureText: { fontSize: 15, color: COLORS.textPrimary },
    btn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 12,
    },
    btnPrimary: { backgroundColor: COLORS.accent },
    btnDanger: { backgroundColor: '#e53935' },
    btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Тест-режим</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {(isLoading || onboardingShown === null) ? (
          <Text style={styles.hint}>Загрузка...</Text>
        ) : session ? (
          <View>
            <View style={styles.activeBadge}>
              <Ionicons name="flask" size={16} color={COLORS.accent} />
              <Text style={styles.activeBadgeText}>Тест-сессия активна</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{session.interactionCount}</Text>
                <Text style={styles.statLabel}>действий</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{session.likedCount}</Text>
                <Text style={styles.statLabel}>лайков</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Завершить сессию</Text>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleEnd('keep')}
              disabled={endMutation.isPending}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.btnPrimaryText}>Перенести понравившееся</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => handleEnd('discard')}
              disabled={endMutation.isPending}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.btnPrimaryText}>Удалить без следа</Text>
            </TouchableOpacity>
          </View>
        ) : onboardingShown ? (
          // Уже видел онбординг — показываем компактный экран запуска
          <View style={styles.quickStart}>
            <Ionicons name="flask" size={48} color={COLORS.accent} />
            <Text style={styles.heading}>Тест-режим</Text>
            <Text style={[styles.description, { marginBottom: 16 }]}>
              Слушай без последствий для алгоритма
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.btnPrimaryText}>
                {startMutation.isPending ? 'Запуск...' : 'Начать сессию'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Первый раз — полный онбординг
          <View>
            <View style={styles.iconWrap}>
              <Ionicons name="flask-outline" size={64} color={COLORS.accent} />
            </View>
            <Text style={styles.heading}>Тест-режим</Text>
            <Text style={styles.description}>
              Изолированная сессия для безопасного эксперимента с музыкой.
              Все лайки и скипы записываются отдельно и не влияют на твои основные рекомендации.
            </Text>

            <View style={styles.featureList}>
              {[
                'Слушай без последствий для алгоритма',
                'Лайки хранятся только в сессии',
                'В конце — перенести или удалить',
              ].map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={16} color={COLORS.accent} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.btnPrimaryText}>
                {startMutation.isPending ? 'Запуск...' : 'Начать тест-сессию'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

