import * as SecureStore from 'expo-secure-store';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import kk from '../locales/kk.json';
import ru from '../locales/ru.json';

const LOCALE_KEY = 'moodstream_locale';
const VALID_LOCALES = ['ru', 'kk', 'en'];

function detectLocale(): string {
  try {
    const lang =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'ru';
    const code = lang.split('-')[0].toLowerCase();
    if (code === 'kk') return 'kk';
    if (code === 'en') return 'en';
    return 'ru';
  } catch {
    return 'ru';
  }
}

i18next.use(initReactI18next).init({
  lng: detectLocale(),
  fallbackLng: 'ru',
  resources: {
    ru: { translation: ru },
    kk: { translation: kk },
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

/** Load saved locale from storage and apply it. Call once on app start. */
export async function loadSavedLocale(): Promise<void> {
  try {
    const saved = await SecureStore.getItemAsync(LOCALE_KEY);
    if (saved && VALID_LOCALES.includes(saved)) {
      await i18next.changeLanguage(saved);
    }
  } catch {
    // ignore
  }
}

/** Save chosen locale to storage. */
export async function saveLocale(code: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCALE_KEY, code);
  } catch {
    // ignore
  }
}

export default i18next;
