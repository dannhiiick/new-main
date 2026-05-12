import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import i18next from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../hooks/useColors';
import { THEME_META, type ThemeId } from '../../constants/themes';
import { apiPost } from '../../lib/api';
import { saveLocale } from '../../lib/i18n';
import { useAuthStore } from '../../store/auth';
import { useOfflineStore } from '../../store/offline';
import { useTestMode } from '../../store/testMode';
import { useThemeStore } from '../../store/theme';

type Locale = 'ru' | 'kk' | 'en';
const LOCALES: { code: Locale; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'en', label: 'English' },
];

function SectionHeader({ title }: { title: string }) {
  const COLORS = useColors();
  const style = useMemo(() => ({
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  }), [COLORS]);
  return <Text style={style}>{title}</Text>;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      color: COLORS.textPrimary,
    },
    dangerText: {
      color: COLORS.danger,
    },
    rowValue: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
  }), [COLORS]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Ionicons
        name={icon as 'globe-outline'}
        size={20}
        color={danger ? COLORS.danger : COLORS.textSecondary}
      />
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      {value !== undefined && (
        <Text style={styles.rowValue}>{value}</Text>
      )}
      {onPress && !danger && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const COLORS = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const entries = useOfflineStore(s => s.entries);
  const removeAll = useOfflineStore(s => s.remove);
  const { active: testActive, start: startTest, end: endTest, session: testSession } = useTestMode();
  const [downloadsExpanded, setDownloadsExpanded] = useState(false);

  const [currentLocale, setCurrentLocale] = useState<Locale>(
    (i18next.language as Locale) ?? 'ru',
  );

  const { themeId, setTheme } = useThemeStore();

  const { updateDisplayName } = useAuthStore();
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editNameSaving, setEditNameSaving] = useState(false);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<'BUG' | 'COMPLAINT' | 'FEATURE_REQUEST' | 'OTHER'>('BUG');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    scroll: {
      paddingBottom: 120,
    },
    avatarSection: {
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 24,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: COLORS.accentDim,
      borderWidth: 2,
      borderColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 36,
      fontWeight: '800' as const,
      color: COLORS.accent,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: COLORS.bg,
    },
    displayName: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: COLORS.textPrimary,
    },
    role: {
      fontSize: 13,
      color: COLORS.textSecondary,
      marginTop: 4,
      textTransform: 'capitalize' as const,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: COLORS.surfaceGlass,
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    rowBorderTop: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      color: COLORS.textPrimary,
    },
    rowValue: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    dangerText: {
      color: COLORS.danger,
    },
    version: {
      fontSize: 12,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginTop: 24,
    },
  }), [COLORS]);

  const offlineStyles = useMemo(() => StyleSheet.create({
    list: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.borderSubtle,
    },
    cover: {
      width: 44,
      height: 44,
      borderRadius: 6,
    },
    coverFallback: {
      backgroundColor: COLORS.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1 },
    title: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: COLORS.textPrimary,
    },
    meta: {
      fontSize: 11,
      color: COLORS.textMuted,
      marginTop: 2,
    },
  }), [COLORS]);

  const themeStyles = useMemo(() => StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 12,
      gap: 10,
    },
    swatch: {
      width: '45%',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      overflow: 'hidden',
      position: 'relative',
    },
    swatchActive: {
      borderColor: COLORS.accent,
    },
    preview: {
      height: 64,
      padding: 10,
      justifyContent: 'flex-end',
      gap: 6,
    },
    accentDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignSelf: 'flex-end',
    },
    surfaceBar: {
      height: 8,
      borderRadius: 4,
      width: '70%',
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: COLORS.textSecondary,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    check: {
      position: 'absolute',
      top: 6,
      right: 6,
    },
  }), [COLORS]);

  const feedbackStyles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
      paddingTop: 12,
      borderTopWidth: 1,
      borderColor: COLORS.border,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: COLORS.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: 16,
    },
    categories: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    catPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    catPillActive: {
      backgroundColor: COLORS.accent + '22',
      borderColor: COLORS.accent,
    },
    catLabel: {
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    catLabelActive: {
      color: COLORS.accent,
      fontWeight: '600' as const,
    },
    input: {
      backgroundColor: COLORS.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: COLORS.textPrimary,
      fontSize: 14,
      minHeight: 100,
      marginBottom: 4,
    },
    charCount: {
      fontSize: 11,
      color: COLORS.textMuted,
      textAlign: 'right',
      marginBottom: 16,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
    },
    cancelText: {
      color: COLORS.textSecondary,
      fontSize: 15,
      fontWeight: '600' as const,
    },
    sendBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
    sendText: {
      color: COLORS.bg,
      fontSize: 15,
      fontWeight: '700' as const,
    },
  }), [COLORS]);

  // Calculate offline storage used
  const downloadedEntries = Object.values(entries).filter(e => e.state === 'done');
  const totalBytes = downloadedEntries.reduce((sum, e) => sum + (e.fileSizeBytes ?? 0), 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  const handleLanguageSelect = (code: Locale) => {
    setCurrentLocale(code);
    void i18next.changeLanguage(code);
    void saveLocale(code);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout'), t('profile.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await apiPost('/api/v1/auth/logout', {});
            } catch {
              // Best-effort — clear locally regardless
            }
            await clearAuth();
            router.replace('/(auth)/login');
          })();
        },
      },
    ]);
  };

  const handleSaveDisplayName = async () => {
    const name = editNameValue.trim();
    if (!name) return;
    setEditNameSaving(true);
    try {
      await updateDisplayName(name);
      setEditNameVisible(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить имя.');
    } finally {
      setEditNameSaving(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setFeedbackSending(true);
    try {
      await apiPost('/api/v1/feedback', {
        category: feedbackCategory,
        message: feedbackMessage.trim(),
        appVersion,
        platform: Platform.OS,
      });
      setFeedbackMessage('');
      setFeedbackVisible(false);
      Alert.alert('Спасибо!', 'Ваш отзыв отправлен.');
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить. Попробуйте позже.');
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleClearDownloads = () => {
    if (downloadedEntries.length === 0) return;
    Alert.alert(t('profile.clear_downloads'), t('profile.clear_downloads_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          for (const entry of downloadedEntries) {
            void removeAll(entry.trackId);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => {
              setEditNameValue(user?.displayName ?? '');
              setEditNameVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>
                {(user?.displayName ?? '?')[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="pencil" size={12} color={COLORS.bg} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditNameValue(user?.displayName ?? '');
              setEditNameVisible(true);
            }}
          >
            <Text style={styles.displayName}>{user?.displayName ?? '—'}</Text>
          </TouchableOpacity>
          <Text style={styles.role}>{user?.role ?? ''}</Text>
        </View>

        {/* Language */}
        <SectionHeader title={t('profile.language')} />
        <View style={styles.card}>
          {LOCALES.map((locale, idx) => (
            <TouchableOpacity
              key={locale.code}
              style={[
                styles.row,
                idx < LOCALES.length - 1 && styles.rowBorder,
              ]}
              onPress={() => handleLanguageSelect(locale.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>{locale.label}</Text>
              {currentLocale === locale.code && (
                <Ionicons name="checkmark" size={18} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Offline storage */}
        <SectionHeader title={t('profile.offline_storage')} />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setDownloadsExpanded(e => !e)}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.rowLabel}>{t('common.downloaded')}</Text>
            <Text style={styles.rowValue}>{downloadedEntries.length} треков · {totalMb} МБ</Text>
            <Ionicons
              name={downloadsExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {downloadsExpanded && downloadedEntries.length > 0 && (
            <View style={offlineStyles.list}>
              {downloadedEntries.map(entry => {
                const track = entry.track;
                const mb = ((entry.fileSizeBytes ?? 0) / (1024 * 1024)).toFixed(1);
                return (
                  <View key={entry.trackId} style={offlineStyles.item}>
                    {track?.coverUrl ? (
                      <Image source={{ uri: track.coverUrl }} style={offlineStyles.cover} />
                    ) : (
                      <View style={[offlineStyles.cover, offlineStyles.coverFallback]}>
                        <Ionicons name="musical-note" size={14} color={COLORS.textMuted} />
                      </View>
                    )}
                    <View style={offlineStyles.info}>
                      <Text style={offlineStyles.title} numberOfLines={1}>
                        {track?.title ?? entry.trackId}
                      </Text>
                      <Text style={offlineStyles.meta} numberOfLines={1}>
                        {track?.artists.map(a => a.name).join(', ') ?? '—'} · {mb} МБ
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        void useOfflineStore.getState().remove(entry.trackId);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.rowBorderTop}>
            <SettingsRow
              icon="trash-outline"
              label={t('profile.clear_downloads')}
              onPress={downloadedEntries.length > 0 ? handleClearDownloads : undefined}
              danger={downloadedEntries.length > 0}
            />
          </View>
        </View>

        {/* Taste Map */}
        <SectionHeader title="Аналитика" />
        <View style={styles.card}>
          <SettingsRow
            icon="time-outline"
            label="История прослушиваний"
            value="Что слушал недавно"
            onPress={() => router.push('/history' as never)}
          />
          <SettingsRow
            icon="map-outline"
            label="Карта вкусов"
            value="Жанры и предпочтения"
            onPress={() => router.push('/taste-map' as never)}
          />
          <SettingsRow
            icon="people-outline"
            label="Релизы друзей"
            value="Новинки от артистов"
            onPress={() => router.push('/social-feed' as never)}
          />
          <SettingsRow
            icon="copy-outline"
            label="Клон вкуса"
            value="Слушай как другой пользователь"
            onPress={() => router.push('/taste-clone' as never)}
          />
          <SettingsRow
            icon="flask-outline"
            label="Тест-режим"
            value="Экспериментируй без последствий"
            onPress={() => router.push('/test-mode' as never)}
          />
        </View>

        {/* Mood Machine */}
        <View style={styles.card}>
          <SettingsRow
            icon="musical-notes-outline"
            label="Mood Machine"
            value="Поиск музыки по настроению"
            onPress={() => router.push('/mood-search' as never)}
          />
        </View>

        {/* Test Mode */}
        <SectionHeader title="Экспериментальное" />
        <View style={styles.card}>
          <SettingsRow
            icon="flask-outline"
            label={testActive ? 'Тест-режим активен' : 'Тест-режим'}
            value={testActive ? `Сессия идёт · ${testSession?._count?.interactions ?? 0} треков` : 'Слушай без следа'}
            onPress={testActive ? () => {
              Alert.alert(
                'Завершить тест-режим',
                'Сохранить понравившиеся треки в библиотеку?',
                [
                  {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                      await endTest(false);
                      Alert.alert('Готово', 'Сессия завершена без сохранения');
                    },
                  },
                  {
                    text: 'Сохранить',
                    onPress: async () => {
                      const res = await endTest(true);
                      Alert.alert('Готово', `Перенесено ${res.transferredCount} треков`);
                    },
                  },
                  { text: 'Отмена', style: 'cancel' },
                ],
              );
            } : () => void startTest()}
          />
        </View>

        {/* Appearance */}
        <SectionHeader title="Внешний вид" />
        <View style={styles.card}>
          <View style={themeStyles.grid}>
            {(Object.keys(THEME_META) as ThemeId[]).map((id) => {
              const meta = THEME_META[id];
              const isActive = themeId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[themeStyles.swatch, isActive && themeStyles.swatchActive]}
                  onPress={() => void setTheme(id)}
                  activeOpacity={0.75}
                >
                  <View style={[themeStyles.preview, { backgroundColor: meta.bg }]}>
                    <View style={[themeStyles.accentDot, { backgroundColor: meta.accent }]} />
                    <View style={[themeStyles.surfaceBar, { backgroundColor: meta.surface }]} />
                  </View>
                  <Text style={[themeStyles.label, isActive && { color: COLORS.accent }]}>
                    {meta.label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} style={themeStyles.check} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subscription */}
        <SectionHeader title={t('profile.subscription')} />
        <View style={styles.card}>
          <SettingsRow
            icon="star-outline"
            label={t('profile.subscription_free')}
            onPress={() => router.push('/subscription')}
          />
        </View>

        {/* Account */}
        <SectionHeader title="" />
        <View style={styles.card}>
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Обратная связь"
            onPress={() => setFeedbackVisible(true)}
          />
          <View style={styles.rowBorderTop}>
            <SettingsRow
              icon="log-out-outline"
              label={t('profile.logout')}
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <Text style={styles.version}>
          {t('profile.version')} {appVersion}
        </Text>
      </ScrollView>

      {/* Edit display name modal */}
      <Modal
        visible={editNameVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !editNameSaving && setEditNameVisible(false)}
      >
        <KeyboardAvoidingView
          style={feedbackStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={feedbackStyles.backdrop}
            activeOpacity={1}
            onPress={() => !editNameSaving && setEditNameVisible(false)}
          />
          <View style={feedbackStyles.sheet}>
            <View style={feedbackStyles.handle} />
            <Text style={feedbackStyles.title}>Редактировать имя</Text>
            <TextInput
              style={[feedbackStyles.input, { minHeight: 0, height: 52 }]}
              placeholder="Ваше имя"
              placeholderTextColor={COLORS.textMuted}
              value={editNameValue}
              onChangeText={setEditNameValue}
              maxLength={80}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void handleSaveDisplayName()}
            />
            <View style={feedbackStyles.btnRow}>
              <TouchableOpacity
                style={feedbackStyles.cancelBtn}
                onPress={() => setEditNameVisible(false)}
                disabled={editNameSaving}
              >
                <Text style={feedbackStyles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[feedbackStyles.sendBtn, (!editNameValue.trim() || editNameSaving) && feedbackStyles.sendBtnDisabled]}
                onPress={() => void handleSaveDisplayName()}
                disabled={!editNameValue.trim() || editNameSaving}
              >
                <Text style={feedbackStyles.sendText}>{editNameSaving ? 'Сохранение...' : 'Сохранить'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={feedbackVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <KeyboardAvoidingView
          style={feedbackStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={feedbackStyles.backdrop}
            activeOpacity={1}
            onPress={() => setFeedbackVisible(false)}
          />
          <View style={feedbackStyles.sheet}>
            <View style={feedbackStyles.handle} />
            <Text style={feedbackStyles.title}>Обратная связь</Text>
            <Text style={feedbackStyles.subtitle}>Расскажите о проблеме или предложении</Text>

            {/* Category pills */}
            <View style={feedbackStyles.categories}>
              {([
                { key: 'BUG', label: 'Баг' },
                { key: 'COMPLAINT', label: 'Жалоба' },
                { key: 'FEATURE_REQUEST', label: 'Фича' },
                { key: 'OTHER', label: 'Другое' },
              ] as const).map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[feedbackStyles.catPill, feedbackCategory === cat.key && feedbackStyles.catPillActive]}
                  onPress={() => setFeedbackCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[feedbackStyles.catLabel, feedbackCategory === cat.key && feedbackStyles.catLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Message input */}
            <TextInput
              style={feedbackStyles.input}
              placeholder="Опишите проблему или предложение..."
              placeholderTextColor={COLORS.textMuted}
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={feedbackStyles.charCount}>{feedbackMessage.length}/2000</Text>

            {/* Buttons */}
            <View style={feedbackStyles.btnRow}>
              <TouchableOpacity
                style={feedbackStyles.cancelBtn}
                onPress={() => setFeedbackVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={feedbackStyles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[feedbackStyles.sendBtn, (!feedbackMessage.trim() || feedbackSending) && feedbackStyles.sendBtnDisabled]}
                onPress={() => void handleSendFeedback()}
                activeOpacity={0.8}
                disabled={!feedbackMessage.trim() || feedbackSending}
              >
                <Text style={feedbackStyles.sendText}>{feedbackSending ? 'Отправка...' : 'Отправить'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
