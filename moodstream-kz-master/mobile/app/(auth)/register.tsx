import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '../../constants/theme';
import { ApiError, NetworkError, apiPost } from '../../lib/api';
import type { OtpVerifyResponse } from '../../lib/types';
import { useAuthStore } from '../../store/auth';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setTokens } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMsg(null);

    if (!name.trim() || !email.trim() || !password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setErrorMsg(t('auth.passwords_dont_match'));
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiPost<OtpVerifyResponse>('/api/v1/auth/email/register', {
        email: email.trim().toLowerCase(),
        password,
        displayName: name.trim(),
      });
      await setTokens(data.accessToken, data.refreshToken, data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrorMsg(t('auth.error_email_exists'));
        } else {
          setErrorMsg(err.message);
        }
      } else if (err instanceof NetworkError) {
        Alert.alert(t('common.error'), err.message, [
          { text: t('common.retry'), onPress: () => void handleRegister() },
          { text: t('common.cancel'), style: 'cancel' },
        ]);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.register')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.name_label')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('auth.name_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            autoComplete="name"
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('auth.email_label')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.email_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('auth.password_label')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.password_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>{t('auth.confirm_password_label')}</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('auth.confirm_password_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void handleRegister()}
            editable={!isLoading}
          />

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={() => void handleRegister()}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? <ActivityIndicator color="#000" /> : (
              <Text style={styles.buttonText}>{t('auth.register')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.back()}
          >
            <Text style={styles.linkTextSecondary}>
              {t('auth.have_account')}{' '}
              <Text style={styles.linkText}>{t('auth.login')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 8 },
  form: { gap: 12 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '700', color: COLORS.bg },
  errorText: { fontSize: 13, color: COLORS.danger, textAlign: 'center' },
  linkRow: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 14, color: COLORS.accent },
  linkTextSecondary: { fontSize: 14, color: COLORS.textSecondary },
});
