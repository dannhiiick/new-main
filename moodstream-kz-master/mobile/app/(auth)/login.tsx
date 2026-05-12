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
import type { OtpRequestResponse, OtpVerifyResponse } from '../../lib/types';
import { useAuthStore } from '../../store/auth';

const IS_DEV = __DEV__;

type AuthTab = 'phone' | 'email';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setTokens } = useAuthStore();

  const [tab, setTab] = useState<AuthTab>('phone');

  // Phone OTP state
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startCountdown = (seconds: number) => {
    setRetryAfter(seconds);
    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!phone.trim() || isLoading || retryAfter > 0) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiPost<OtpRequestResponse>(
        '/api/v1/auth/otp/request',
        { phone: phone.trim() },
      );
      setChallengeId(data.challengeId);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 429) {
        startCountdown(30);
        setErrorMsg(t('auth.wait_seconds', { seconds: 30 }));
      } else if (err instanceof NetworkError) {
        Alert.alert(t('common.error'), err.message, [
          { text: t('common.retry'), onPress: () => void handleSendCode() },
          { text: t('common.cancel'), style: 'cancel' },
        ]);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!challengeId || !code.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiPost<OtpVerifyResponse>(
        '/api/v1/auth/otp/verify',
        { challengeId, code: code.trim() },
      );
      await setTokens(data.accessToken, data.refreshToken, data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 400 || err.status === 401) {
          setErrorMsg(t('auth.error_invalid_code'));
        } else if (err.status === 410) {
          setErrorMsg(t('auth.error_expired'));
          setChallengeId(null);
        } else {
          setErrorMsg(err.message);
        }
      } else if (err instanceof NetworkError) {
        Alert.alert(t('common.error'), err.message, [
          { text: t('common.retry'), onPress: () => void handleVerify() },
          { text: t('common.cancel'), style: 'cancel' },
        ]);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiPost<OtpVerifyResponse>('/api/v1/auth/email/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      await setTokens(data.accessToken, data.refreshToken, data.user);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setErrorMsg(t('auth.error_invalid_credentials'));
      } else if (err instanceof NetworkError) {
        Alert.alert(t('common.error'), err.message, [
          { text: t('common.retry'), onPress: () => void handleEmailLogin() },
          { text: t('common.cancel'), style: 'cancel' },
        ]);
      } else {
        setErrorMsg(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (next: AuthTab) => {
    setTab(next);
    setErrorMsg(null);
    setChallengeId(null);
    setCode('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'phone' && styles.tabBtnActive]}
            onPress={() => switchTab('phone')}
          >
            <Text style={[styles.tabText, tab === 'phone' && styles.tabTextActive]}>
              {t('auth.tab_phone')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'email' && styles.tabBtnActive]}
            onPress={() => switchTab('email')}
          >
            <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>
              {t('auth.tab_email')}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'phone' ? (
          !challengeId ? (
            <View style={styles.form}>
              <Text style={styles.label}>{t('auth.phone_label')}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('auth.phone_placeholder')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={() => void handleSendCode()}
                editable={!isLoading}
              />
              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              <TouchableOpacity
                style={[styles.button, (isLoading || retryAfter > 0) && styles.buttonDisabled]}
                onPress={() => void handleSendCode()}
                disabled={isLoading || retryAfter > 0}
                activeOpacity={0.8}
              >
                {isLoading ? <ActivityIndicator color="#000" /> : (
                  <Text style={styles.buttonText}>
                    {retryAfter > 0 ? t('auth.wait_seconds', { seconds: retryAfter }) : t('auth.send_code')}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.linkTextSecondary}>
                  {t('auth.no_account')}{' '}
                  <Text style={styles.linkText}>{t('auth.register')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>{t('auth.enter_code')}</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                placeholder="• • • •"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => void handleVerify()}
                editable={!isLoading}
              />
              {IS_DEV && <Text style={styles.devHint}>{t('auth.dev_hint')}</Text>}
              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={() => void handleVerify()}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? <ActivityIndicator color="#000" /> : (
                  <Text style={styles.buttonText}>{t('auth.verify')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => { setChallengeId(null); setCode(''); }}
                disabled={isLoading}
              >
                <Text style={styles.resendText}>{t('auth.resend')}</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
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
              returnKeyType="done"
              onSubmitEditing={() => void handleEmailLogin()}
              editable={!isLoading}
            />
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => void handleEmailLogin()}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? <ActivityIndicator color="#000" /> : (
                <Text style={styles.buttonText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/(auth)/forgot')}
            >
              <Text style={styles.linkText}>{t('auth.forgot_password')}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => router.push('/(auth)/register')}
            >
              <Text style={styles.linkTextSecondary}>
                {t('auth.no_account')}{' '}
                <Text style={styles.linkText}>{t('auth.register')}</Text>
              </Text>
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
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 8 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.accentDim },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.accentLight },
  form: { gap: 12 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  codeInput: { fontSize: 24, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resendButton: { alignItems: 'center', paddingVertical: 12 },
  resendText: { fontSize: 14, color: COLORS.textSecondary },
  errorText: { fontSize: 13, color: COLORS.danger, textAlign: 'center' },
  devHint: {
    fontSize: 12, color: COLORS.accentLight, textAlign: 'center',
    backgroundColor: COLORS.accentDim, padding: 8, borderRadius: 10,
  },
  linkRow: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 14, color: COLORS.accent },
  linkTextSecondary: { fontSize: 14, color: COLORS.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 4 },
});
