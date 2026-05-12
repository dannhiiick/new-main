import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { apiPost, apiFetch } from '../lib/api';
import type { AuthUser, OtpVerifyResponse, RefreshResponse } from '../lib/types';

const KEY_ACCESS = 'moodstream_access_token';
const KEY_REFRESH = 'moodstream_refresh_token';
const KEY_USER = 'moodstream_user';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setTokens(
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
  ): Promise<void>;
  clearAuth(): Promise<void>;
  loadFromStorage(): Promise<void>;
  updateDisplayName(name: string): Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoading: true,

  async setTokens(accessToken, refreshToken, user) {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, accessToken),
      SecureStore.setItemAsync(KEY_REFRESH, refreshToken),
      SecureStore.setItemAsync(KEY_USER, JSON.stringify(user)),
    ]);
    set({ accessToken, refreshToken, user });
  },

  async clearAuth() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      SecureStore.deleteItemAsync(KEY_USER),
    ]);
    set({ accessToken: null, refreshToken: null, user: null });
  },

  async updateDisplayName(name: string) {
    const res = await apiFetch<{ user: AuthUser }>('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: name }),
    });
    const updated = res.user;
    await SecureStore.setItemAsync(KEY_USER, JSON.stringify(updated));
    set(s => ({ user: s.user ? { ...s.user, displayName: updated.displayName } : s.user }));
  },

  async loadFromStorage() {
    set({ isLoading: true });
    try {
      const [accessToken, refreshToken, userRaw] = await Promise.all([
        SecureStore.getItemAsync(KEY_ACCESS),
        SecureStore.getItemAsync(KEY_REFRESH),
        SecureStore.getItemAsync(KEY_USER),
      ]);

      const user: AuthUser | null = userRaw
        ? (JSON.parse(userRaw) as AuthUser)
        : null;

      if (refreshToken) {
        // Try to refresh to verify tokens are still valid
        try {
          const data = await apiPost<RefreshResponse>(
            '/api/v1/auth/refresh',
            { refreshToken },
          );
          await Promise.all([
            SecureStore.setItemAsync(KEY_ACCESS, data.accessToken),
            SecureStore.setItemAsync(KEY_REFRESH, data.refreshToken),
          ]);
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user,
            isLoading: false,
          });
          return;
        } catch {
          // Refresh failed — clear tokens
          void Promise.all([
            SecureStore.deleteItemAsync(KEY_ACCESS),
            SecureStore.deleteItemAsync(KEY_REFRESH),
            SecureStore.deleteItemAsync(KEY_USER),
          ]);
          set({ accessToken: null, refreshToken: null, user: null, isLoading: false });
          return;
        }
      }

      set({ accessToken, refreshToken, user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));

// Export a standalone OTP verify helper used by login screen
export async function verifyOtp(params: {
  challengeId: string;
  code: string;
  deviceId?: string;
}): Promise<OtpVerifyResponse> {
  return apiPost<OtpVerifyResponse>('/api/v1/auth/otp/verify', params);
}
