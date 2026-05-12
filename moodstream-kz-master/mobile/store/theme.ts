import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { THEMES, type ThemeId } from '../constants/themes';

const THEME_KEY = 'moodstream_theme';

interface ThemeStore {
  themeId: ThemeId;
  palette: typeof THEMES.steppe_night;
  setTheme: (id: ThemeId) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: 'steppe_night',
  palette: THEMES.steppe_night,
  setTheme: async (id) => {
    set({ themeId: id, palette: THEMES[id] });
    await SecureStore.setItemAsync(THEME_KEY, id);
  },
  loadTheme: async () => {
    const saved = await SecureStore.getItemAsync(THEME_KEY);
    if (saved && saved in THEMES) {
      const id = saved as ThemeId;
      set({ themeId: id, palette: THEMES[id] });
    }
  },
}));
