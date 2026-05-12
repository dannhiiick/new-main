import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  bg: '#0a0a0a',
  surface: '#111',
  accent: '#1DB954',
  accentDark: '#0d4022',
  gold: '#f5c518',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#444444',
};

const FEATURES = [
  { icon: 'download-outline', key: 'feature_offline' },
  { icon: 'musical-notes-outline', key: 'feature_quality' },
  { icon: 'ban-outline', key: 'feature_ads' },
  { icon: 'play-skip-forward-outline', key: 'feature_skip' },
] as const;

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-down" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo badge */}
        <View style={styles.badge}>
          <Ionicons name="star" size={28} color={COLORS.gold} />
        </View>

        <Text style={styles.title}>{t('subscription.title')}</Text>
        <Text style={styles.subtitle}>{t('subscription.subtitle')}</Text>

        {/* Price */}
        <View style={styles.priceBox}>
          <Text style={styles.price}>{t('subscription.price')}</Text>
        </View>

        {/* Features */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.featureText}>{t(`subscription.${f.key}`)}</Text>
            </View>
          ))}
        </View>

        {/* CTA — disabled (coming soon) */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaBtn}>
            <Ionicons name="time-outline" size={18} color={COLORS.accent} />
            <Text style={styles.ctaText}>{t('subscription.coming_soon')}</Text>
          </View>
          <Text style={styles.ctaHint}>
            Оплата в KZT · Без привязки карты сейчас
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    alignItems: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  priceBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.accent,
  },
  featureList: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  ctaSection: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  ctaBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  ctaHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
