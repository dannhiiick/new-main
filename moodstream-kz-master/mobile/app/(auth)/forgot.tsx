import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '../../constants/theme';
import { ApiError, NetworkError, apiPost } from '../../lib/api';

const IS_DEV = __DEV__;

type Step = 'request' | 'reset';

export default function ForgotScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequest = async () => {
    if (!email.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiPost<{ devToken?: string }>('/api/v1/auth/email/forgot', {
        email: email.trim().toLowerCase(),
      });
      if (IS_DEV && data.devToken) {
        setDevToken(data.devToken);
        setToken(data.devToken);
      }
      setStep('reset');
    } catch (err: unknown) {
      if (err instanceof NetworkError) {
        Alert.alert(t('common.error'), err.message, [
          { text: t('common.retry'), onPress: () => void handleRequest() },
          { text: t('common.cancel'), style: 'cancel' },
        ]);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token.trim() || !newPassword || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await apiPost('/api/v1/auth/email/reset', {
        token: token.trim(),
        password: newPassword,
      });
      Alert.alert(t('auth.reset_success'), '', [
        { text: t('common.done'), onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 400) {
        setErrorMsg(t('auth.error_invalid_reset_token'));
      } else if (err instanceof NetworkError) {
        Alert.alert(t('common.error'), err.message, [
          { text: t('common.retry'), onPress: () => void handleReset() },
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
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← {t('common.cancel')}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.forgot_title')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgot_subtitle')}</Text>
        </View>

        {step === 'request' ? (
          <View style={styles.form}>
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
              returnKeyType="done"
              onSubmitEditing={() => void handleRequest()}
              editable={!isLoading}
            />

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => void handleRequest()}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator color="#000" /> : (
                <Text style={styles.buttonText}>{t('auth.forgot_send')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.successMsg}>{t('auth.forgot_success')}</Text>

            {IS_DEV && devToken && (
              <Text style={styles.devHint}>
                {t('auth.forgot_dev_hint', { token: devToken })}
              </Text>
            )}

            <Text style={styles.label}>{t('auth.reset_token_label')}</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder={t('auth.reset_token_placeholder')}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              returnKeyType="next"
              editable={!isLoading}
            />

            <Text style={styles.label}>{t('auth.new_password_label')}</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('auth.password_placeholder')}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={() => void handleReset()}
              editable={!isLoading}
            />

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => void handleReset()}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator color="#000" /> : (
                <Text style={styles.buttonText}>{t('auth.reset_password')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  backBtn: { position: 'absolute', top: 60, left: 32 },
  backText: { fontSize: 14, color: COLORS.textSecondary },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
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
  successMsg: { fontSize: 14, color: COLORS.accent, textAlign: 'center', marginBottom: 4 },
  devHint: {
    fontSize: 12, color: COLORS.accentLight, textAlign: 'center',
    backgroundColor: COLORS.accentDim, padding: 8, borderRadius: 10,
  },
});
