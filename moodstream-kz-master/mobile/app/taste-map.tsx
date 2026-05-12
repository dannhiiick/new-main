import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../hooks/useColors';
import { apiGet } from '../lib/api';
import type { GenreNode, TasteMapResponse } from '../lib/types';
import { PressableScale } from '../components/ui/PressableScale';

const { width: SCREEN_W } = Dimensions.get('window');

const GENRE_LABELS: Record<string, string> = {
  pop: 'Поп', rock: 'Рок', jazz: 'Джаз', hiphop: 'Хип-хоп', 'hip-hop': 'Хип-хоп',
  electronic: 'Электроника', classical: 'Классика', folk: 'Народная', rnb: 'R&B',
  'r&b': 'R&B', metal: 'Метал', alternative: 'Альтернатива', country: 'Кантри',
  latin: 'Латин', reggae: 'Регги', blues: 'Блюз', soul: 'Соул', indie: 'Инди',
  other: 'Другое',
};

function genreLabel(slug: string): string {
  return GENRE_LABELS[slug.toLowerCase()] ?? slug;
}

const GENRE_COLORS = [
  '#C87B4E', '#4FC5C7', '#C87B9E', '#7BC87B',
  '#C8B47B', '#9E7BC8', '#E57B6E', '#7B9EC8',
  '#B4C87B', '#7B7BC8',
];

function genreColor(genre: string): string {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + (hash << 5) - hash;
  return GENRE_COLORS[Math.abs(hash) % GENRE_COLORS.length]!;
}

// Affinity → color tint: copper (high) → grey (low)
function affinityTint(score: number, colors: ReturnType<typeof useColors>): string {
  if (score > 0.6) return colors.accent;
  if (score > 0.3) return colors.accentLight;
  return colors.textMuted;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  const COLORS = useColors();
  const statStyles = useMemo(() => StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    value: {
      fontSize: 24,
      fontWeight: '800',
      color: COLORS.textPrimary,
      letterSpacing: -0.5,
    },
    label: {
      fontSize: 11,
      color: COLORS.textMuted,
      marginTop: 3,
      textAlign: 'center',
    },
    sub: {
      fontSize: 10,
      color: COLORS.textMuted,
      marginTop: 2,
      opacity: 0.7,
    },
  }), [COLORS]);
  return (
    <View style={statStyles.card}>
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
    </View>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function GenreBubble({
  node,
  maxWeight,
  selected,
  onPress,
}: {
  node: GenreNode;
  maxWeight: number;
  selected: boolean;
  onPress: () => void;
}) {
  const COLORS = useColors();
  const size = Math.max(68, Math.min(148, 68 + (node.weight / maxWeight) * 80));
  const color = genreColor(node.genre);
  const affTint = affinityTint(node.affinityScore, COLORS);
  const pct = Math.round(node.weight * 100);

  const bubbleStyles = useMemo(() => StyleSheet.create({
    bubble: {
      alignItems: 'center',
      justifyContent: 'center',
      margin: 5,
      padding: 8,
    },
    label: {
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 15,
    },
    pct: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 3,
    },
    kz: {
      fontSize: 10,
      marginTop: 1,
    },
  }), [COLORS]);

  return (
    <PressableScale
      style={[
        bubbleStyles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}18`,
          borderColor: selected ? color : `${color}55`,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      scaleDown={0.90}
      haptic="light"
    >
      <Text style={[bubbleStyles.label, { color, fontSize: size > 100 ? 13 : 11 }]} numberOfLines={2}>
        {genreLabel(node.genre)}
      </Text>
      <Text style={[bubbleStyles.pct, { color: affTint }]}>{pct}%</Text>
      {node.isLocal && <Text style={bubbleStyles.kz}>🇰🇿</Text>}
    </PressableScale>
  );
}

// ─── Selected Genre Detail ────────────────────────────────────────────────────

function GenreDetail({ node }: { node: GenreNode }) {
  const COLORS = useColors();
  const color = genreColor(node.genre);
  const affinityPct = Math.round(node.affinityScore * 100);
  const detailStyles = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: 20,
      marginTop: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    name: { fontSize: 17, fontWeight: '700', flex: 1 },
    kz: { fontSize: 14 },
    stats: { flexDirection: 'row', gap: 0, marginBottom: 14 },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statVal: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
    statLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    barLabel: { fontSize: 12, color: COLORS.textSecondary, width: 60 },
    barTrack: {
      flex: 1,
      height: 6,
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: 3,
      overflow: 'hidden',
    },
    barFill: { height: 6, borderRadius: 3 },
    barPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
    hint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  }), [COLORS]);
  return (
    <View style={[detailStyles.card, { borderColor: `${color}44` }]}>
      <View style={detailStyles.row}>
        <View style={[detailStyles.dot, { backgroundColor: color }]} />
        <Text style={[detailStyles.name, { color }]}>{genreLabel(node.genre)}</Text>
        {node.isLocal && <Text style={detailStyles.kz}>🇰🇿</Text>}
      </View>
      <View style={detailStyles.stats}>
        <View style={detailStyles.stat}>
          <Ionicons name="play" size={14} color={COLORS.textSecondary} />
          <Text style={detailStyles.statVal}>{node.playCount}</Text>
          <Text style={detailStyles.statLabel}>прослушиваний</Text>
        </View>
        <View style={detailStyles.stat}>
          <Ionicons name="heart" size={14} color={COLORS.coral} />
          <Text style={detailStyles.statVal}>{node.likeCount}</Text>
          <Text style={detailStyles.statLabel}>лайков</Text>
        </View>
        <View style={detailStyles.stat}>
          <Ionicons name="star" size={14} color={COLORS.accent} />
          <Text style={detailStyles.statVal}>{affinityPct}%</Text>
          <Text style={detailStyles.statLabel}>аффинити</Text>
        </View>
      </View>
      {/* Affinity bar */}
      <View style={detailStyles.barRow}>
        <Text style={detailStyles.barLabel}>Аффинити</Text>
        <View style={detailStyles.barTrack}>
          <View style={[detailStyles.barFill, { width: `${affinityPct}%`, backgroundColor: color }]} />
        </View>
        <Text style={[detailStyles.barPct, { color }]}>{affinityPct}%</Text>
      </View>
      <Text style={detailStyles.hint}>
        {affinityPct > 60
          ? '❤️ Ты очень любишь этот жанр — лайкаешь большинство треков'
          : affinityPct > 30
          ? '👂 Слушаешь регулярно, нравится каждый 3-й трек'
          : '🔍 Исследуешь жанр — редко ставишь лайки'}
      </Text>
    </View>
  );
}

// ─── Genre List Row ───────────────────────────────────────────────────────────

function GenreRow({ node, rank }: { node: GenreNode; rank: number }) {
  const COLORS = useColors();
  const color = genreColor(node.genre);
  const pct = Math.round(node.weight * 100);
  const affPct = Math.round(node.affinityScore * 100);
  const rowStyles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.borderSubtle,
    },
    rank: {
      width: 24,
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.textMuted,
      fontVariant: ['tabular-nums'],
    },
    info: { flex: 1, gap: 7 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    name: { fontSize: 14, fontWeight: '600', color: '#F5F5F7' },
    kz: { fontSize: 12 },
    affBadge: {
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
    },
    affText: { fontSize: 10, fontWeight: '600' },
    barTrack: {
      height: 4,
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: 2,
      overflow: 'hidden',
    },
    barFill: { height: 4, borderRadius: 2 },
    meta: { alignItems: 'flex-end', gap: 3 },
    pct: { fontSize: 14, fontWeight: '700', color: '#F5F5F7' },
    plays: { fontSize: 10, color: COLORS.textMuted },
  }), [COLORS]);
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.rank}>{String(rank).padStart(2, '0')}</Text>
      <View style={rowStyles.info}>
        <View style={rowStyles.nameRow}>
          <Text style={rowStyles.name}>{genreLabel(node.genre)}</Text>
          {node.isLocal && <Text style={rowStyles.kz}>🇰🇿</Text>}
          <View style={[rowStyles.affBadge, { backgroundColor: `${affinityTint(node.affinityScore, COLORS)}22`, borderColor: `${affinityTint(node.affinityScore, COLORS)}55` }]}>
            <Text style={[rowStyles.affText, { color: affinityTint(node.affinityScore, COLORS) }]}>❤️ {affPct}%</Text>
          </View>
        </View>
        <View style={rowStyles.barTrack}>
          <View style={[rowStyles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <View style={rowStyles.meta}>
        <Text style={rowStyles.pct}>{pct}%</Text>
        <Text style={rowStyles.plays}>{node.playCount} прослуш.</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TasteMapScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState<GenreNode | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['taste-map'],
    queryFn: () => apiGet<TasteMapResponse>('/api/v1/taste-map'),
    staleTime: 5 * 60 * 1000,
  });

  const genres = data?.genres ?? [];
  const maxWeight = genres[0]?.weight ?? 1;

  // Stats
  const totalPlays = data?.totalPlays ?? 0;
  const localCount = genres.filter(g => g.isLocal).length;
  const localPct = genres.length > 0 ? Math.round((localCount / genres.length) * 100) : 0;
  const topAffinity = [...genres].sort((a, b) => b.affinityScore - a.affinityScore)[0];
  const diversity = genres.length;

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
      paddingVertical: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: '#F5F5F7',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 12,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginTop: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 32,
    },
    muted: {
      fontSize: 16,
      color: COLORS.textMuted,
      textAlign: 'center',
    },
    hint: {
      fontSize: 13,
      color: COLORS.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    affinityCallout: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 12,
      backgroundColor: 'rgba(229,123,110,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(229,123,110,0.25)',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    affinityText: {
      flex: 1,
      fontSize: 13,
      color: COLORS.textSecondary,
      lineHeight: 18,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#F5F5F7',
      paddingHorizontal: 20,
      marginTop: 20,
      marginBottom: 8,
    },
    bubbleCloud: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    bubbleHint: {
      fontSize: 11,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    listCard: {
      marginHorizontal: 16,
      backgroundColor: COLORS.surface,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#F5F5F7" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Карта вкусов</Text>
          <Text style={styles.subtitle}>За 30 дней</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <Text style={styles.muted}>Загружаем карту...</Text>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Ionicons name="analytics-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.muted}>Недостаточно данных</Text>
          <Text style={styles.hint}>Слушайте музыку — карта появится через несколько дней</Text>
        </View>
      )}

      {!isLoading && !isError && genres.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.muted}>Карта пока пуста</Text>
          <Text style={styles.hint}>Слушайте больше музыки — жанры появятся здесь</Text>
        </View>
      )}

      {genres.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard
              label="прослушиваний"
              value={totalPlays >= 1000 ? `${(totalPlays / 1000).toFixed(1)}K` : String(totalPlays)}
              color={COLORS.accent}
            />
            <StatCard
              label="жанров"
              value={String(diversity)}
              sub="разнообразие"
            />
            <StatCard
              label="KZ музыки"
              value={`${localPct}%`}
              color={COLORS.turquoise}
            />
          </View>

          {/* Top affinity callout */}
          {topAffinity && topAffinity.affinityScore > 0 && (
            <View style={styles.affinityCallout}>
              <Ionicons name="heart" size={14} color={COLORS.coral} />
              <Text style={styles.affinityText}>
                Больше всего любишь{' '}
                <Text style={{ color: COLORS.accent, fontWeight: '700' }}>
                  {genreLabel(topAffinity.genre)}
                </Text>{' '}
                — лайкаешь {Math.round(topAffinity.affinityScore * 100)}% треков
              </Text>
            </View>
          )}

          {/* Bubble cloud */}
          <Text style={styles.sectionTitle}>Жанровые пузыри</Text>
          <View style={styles.bubbleCloud}>
            {genres.slice(0, 12).map((node) => (
              <GenreBubble
                key={node.genre}
                node={node}
                maxWeight={maxWeight}
                selected={selectedGenre?.genre === node.genre}
                onPress={() => setSelectedGenre(
                  selectedGenre?.genre === node.genre ? null : node
                )}
              />
            ))}
          </View>
          <Text style={styles.bubbleHint}>Тапни на жанр для деталей</Text>

          {/* Selected genre detail */}
          {selectedGenre && (
            <GenreDetail node={selectedGenre} />
          )}

          {/* Ranked list */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Подробный список</Text>
          <View style={styles.listCard}>
            {genres.map((node, i) => (
              <GenreRow key={node.genre} node={node} rank={i + 1} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

