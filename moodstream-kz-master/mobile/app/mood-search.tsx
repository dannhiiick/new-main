import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import { TrackSummary } from '../lib/types';
import { useColors } from '../hooks/useColors';
import { usePlayerStore } from '../store/player';

interface MoodSearchResult {
  query: string;
  params: {
    energy: number;
    valence: number;
    danceability: number;
    tempo: 'slow' | 'medium' | 'fast';
    mood: string[];
  };
  tracks: TrackSummary[];
  cached: boolean;
}

const SUGGESTIONS = [
  'Дождливый вечер, кофе, немного грустно',
  'Энергичное утро, хочу зарядиться',
  'Ностальгия, детские воспоминания',
  'Вечеринка, танцы, веселье',
  'Сосредоточенная работа, без слов',
  'Прогулка по городу ночью',
];

export default function MoodSearchScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const { data, isFetching, error } = useQuery<MoodSearchResult>({
    queryKey: ['mood-search', query],
    queryFn: () =>
      apiGet<MoodSearchResult>('/api/v1/mood', {
        q: query!,
        limit: '20',
      }),
    enabled: !!query,
    staleTime: 60 * 60 * 1000,
  });

  function submit() {
    const q = input.trim();
    if (q.length >= 3) setQuery(q);
  }

  function playSuggestion(text: string) {
    setInput(text);
    setQuery(text);
  }

  function playAll() {
    if (data?.tracks?.length) {
      playTrack(data.tracks[0], data.tracks);
    }
  }

  function formatDuration(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
    },
    back: { marginRight: 12 },
    backText: { color: COLORS.textPrimary, fontSize: 28, lineHeight: 32 },
    title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
    inputRow: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 16,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: COLORS.surface,
      color: COLORS.textPrimary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    searchBtn: {
      backgroundColor: COLORS.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      justifyContent: 'center',
    },
    searchBtnDisabled: { opacity: 0.4 },
    searchBtnText: { color: '#fff', fontSize: 20 },
    suggestions: { paddingHorizontal: 16 },
    suggestionsLabel: {
      color: COLORS.textSecondary,
      fontSize: 13,
      marginBottom: 10,
    },
    chip: {
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginBottom: 8,
    },
    chipText: { color: COLORS.textPrimary, fontSize: 14 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    loadingText: { color: COLORS.textSecondary, fontSize: 14, marginTop: 12 },
    errorText: { color: '#ff6b6b', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 8,
      gap: 8,
    },
    moodTags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    moodTag: {
      backgroundColor: COLORS.accent + '33',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    moodTagText: { color: COLORS.accent, fontSize: 12 },
    playAllBtn: {
      backgroundColor: COLORS.accent,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    playAllText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    emptyText: { color: COLORS.textPrimary, fontSize: 16 },
    emptySubtext: { color: COLORS.textSecondary, fontSize: 14 },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    trackIndex: { width: 24, alignItems: 'center' },
    trackIndexText: { color: COLORS.textSecondary, fontSize: 13 },
    trackInfo: { flex: 1 },
    trackTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '500' },
    trackArtist: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
    trackDuration: { color: COLORS.textSecondary, fontSize: 13 },
  }), [COLORS]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mood Machine</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Опишите настроение..."
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="search"
          onSubmitEditing={submit}
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.searchBtn, input.trim().length < 3 && styles.searchBtnDisabled]}
          onPress={submit}
          disabled={input.trim().length < 3}
        >
          <Text style={styles.searchBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {!query && (
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsLabel}>Попробуйте:</Text>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.chip} onPress={() => playSuggestion(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isFetching && (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Подбираю треки...</Text>
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {String((error as Error).message).includes('ANTHROPIC')
              ? 'Mood Machine временно недоступен'
              : 'Ошибка поиска. Попробуйте снова.'}
          </Text>
        </View>
      )}

      {data && !isFetching && (
        <>
          <View style={styles.resultHeader}>
            <View style={styles.moodTags}>
              {data.params.mood.map((m) => (
                <View key={m} style={styles.moodTag}>
                  <Text style={styles.moodTagText}>{m}</Text>
                </View>
              ))}
            </View>
            {data.tracks.length > 0 && (
              <TouchableOpacity style={styles.playAllBtn} onPress={playAll}>
                <Text style={styles.playAllText}>▶ Все</Text>
              </TouchableOpacity>
            )}
          </View>

          {data.tracks.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Треки не найдены</Text>
              <Text style={styles.emptySubtext}>Попробуйте другое описание</Text>
            </View>
          ) : (
            <FlatList
              data={data.tracks}
              keyExtractor={(t) => t.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.trackRow}
                  onPress={() => playTrack(item, data.tracks)}
                >
                  <View style={styles.trackIndex}>
                    <Text style={styles.trackIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {item.artists.map((a) => a.name).join(', ')}
                    </Text>
                  </View>
                  <Text style={styles.trackDuration}>
                    {formatDuration(item.durationMs)}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

