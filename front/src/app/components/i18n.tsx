import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from './api';

export const translations = {
  ru: {
    home: "Главная",
    search: "Поиск",
    tracks: "Треки",
    artists: "Артисты",
    albums: "Альбомы",
    playlists: "Плейлисты",
    genres: "Жанры",
    charts: "Чарты",
    events: "Концерты",
    library: "Моя медиатека",
    profile: "Профиль",
    settings: "Настройки",
    help: "Справка",
    logout: "Выйти",
    login: "Войти",
    register: "Регистрация",
    theme: "Тема оформления",
    lang: "Язык интерфейса",
    save: "Сохранить",
    saved: "Сохранено ✓",
    saving: "Сохранение...",
    buy_ticket: "Купить билет",
    available: "Доступно билетов",
    sold: "Продано",
    price: "Цена",
    notifications: "Уведомления",
    no_notifications: "Нет уведомлений",
    mark_all_read: "Прочитать все",
    empty_library: "Ваша медиатека пуста",
    write_us: "Написать нам",
    premium: "Премиум",
    theme_light: "Светлая",
    theme_dark: "Темная",
    theme_system: "Системная",
    quality: "Качество звука",
    autoplay: "Автовоспроизведение",
    private: "Закрытый профиль",
    bio: "О себе",
    city: "Город",
    displayName: "Отображаемое имя",
    editProfile: "Редактировать профиль",
    recentPlayed: "Недавно прослушанные",
    likedTracks: "Любимые треки",
    followedArtists: "Артисты",
    savedPlaylists: "Плейлисты",
    createPlaylist: "Создать плейлист",
    name: "Название",
    desc: "Описание",
    public: "Публичный",
    resetPassword: "Сбросить пароль",
    forgotPassword: "Забыли пароль?",
    enterEmail: "Введите ваш email",
    sendCode: "Отправить код",
    enterCode: "Введите код восстановления",
    newPassword: "Новый пароль",
    confirm: "Подтвердить",
    search_placeholder: "Поиск треков, артистов, альбомов...",
    popular_queries: "Популярные запросы",
    genres_explore: "Жанры для исследования",
    coming_soon: "Скоро",
    support_team: "Связаться с техподдержкой",
    contact_text: "Если у вас возникли вопросы, вы можете отправить нам сообщение.",
    subject: "Тема обращения",
    message: "Сообщение",
    send: "Отправить",
    buy_ticket_title: "Покупка билета на концерт",
    ticket_success: "Билет успешно куплен! Проверьте email.",
    enter_phone: "Введите ваш телефон",
    enter_email: "Введите ваш email",
    loading: "Загрузка...",
    save_settings: "Сохранить настройки"
  },
  kk: {
    home: "Басты",
    search: "Іздеу",
    tracks: "Тректер",
    artists: "Әртістер",
    albums: "Альбомдар",
    playlists: "Плейлисттер",
    genres: "Жанрлар",
    charts: "Чарттар",
    events: "Концерттер",
    library: "Менің медиатекам",
    profile: "Профиль",
    settings: "Баптаулар",
    help: "Көмек",
    logout: "Шығу",
    login: "Кіру",
    register: "Тіркелу",
    theme: "Бейнелеу тақырыбы",
    lang: "Интерфейс тілі",
    save: "Сақтау",
    saved: "Сақталды ✓",
    saving: "Сақталуда...",
    buy_ticket: "Билет сатып алу",
    available: "Билеттер саны",
    sold: "Сатылды",
    price: "Бағасы",
    notifications: "Хабарландырулар",
    no_notifications: "Хабарландырулар жоқ",
    mark_all_read: "Барлығын оқылды деп белгілеу",
    empty_library: "Медиатекаңыз бос",
    write_us: "Бізге жазу",
    premium: "Премиум",
    theme_light: "Жарық",
    theme_dark: "Қараңғы",
    theme_system: "Жүйелік",
    quality: "Дыбыс сапасы",
    autoplay: "Авто ойнату",
    private: "Жабық профиль",
    bio: "Өзім туралы",
    city: "Қала",
    displayName: "Көрсетілетін есім",
    editProfile: "Профильді өңдеу",
    recentPlayed: "Жақында ойнатылғандар",
    likedTracks: "Ұнаған тректер",
    followedArtists: "Әртістер",
    savedPlaylists: "Плейлисттер",
    createPlaylist: "Плейлист жасау",
    name: "Аты",
    desc: "Сипаттамасы",
    public: "Жария",
    resetPassword: "Парольді қайта орнату",
    forgotPassword: "Парольді ұмыттыңыз ба?",
    enterEmail: "Электрондық поштаны енгізіңіз",
    sendCode: "Кодты жіберу",
    enterCode: "Қалпына келтіру кодын енгізіңіз",
    newPassword: "Жаңа пароль",
    confirm: "Растау",
    search_placeholder: "Тректерді, әртістерді, альбомдарды іздеу...",
    popular_queries: "Танымал сұраныстар",
    genres_explore: "Зерттеуге арналған жанрлар",
    coming_soon: "Жақында",
    support_team: "Қолдау қызметіне хабарласу",
    contact_text: "Егер сұрақтарыңыз болса, бізге хабарлама жібере аласыз.",
    subject: "Тақырыбы",
    message: "Хабарлама",
    send: "Жіберу",
    buy_ticket_title: "Концертке билет сатып алу",
    ticket_success: "Билет сәтті сатып алынды! Поштаңызды тексеріңіз.",
    enter_phone: "Телефон нөмірін енгізіңіз",
    enter_email: "Email енгізіңіз",
    loading: "Жүктелуде...",
    save_settings: "Баптауларды сақтау"
  },
  en: {
    home: "Home",
    search: "Search",
    tracks: "Tracks",
    artists: "Artists",
    albums: "Albums",
    playlists: "Playlists",
    genres: "Genres",
    charts: "Charts",
    events: "Events",
    library: "My Library",
    profile: "Profile",
    settings: "Settings",
    help: "Help",
    logout: "Logout",
    login: "Login",
    register: "Register",
    theme: "Theme Mode",
    lang: "Interface Language",
    save: "Save Settings",
    saved: "Saved ✓",
    saving: "Saving...",
    buy_ticket: "Buy Ticket",
    available: "Tickets Available",
    sold: "Sold",
    price: "Price",
    notifications: "Notifications",
    no_notifications: "No notifications",
    mark_all_read: "Mark all as read",
    empty_library: "Your library is empty",
    write_us: "Contact us",
    premium: "Premium",
    theme_light: "Light",
    theme_dark: "Dark",
    theme_system: "System",
    quality: "Audio Quality",
    autoplay: "Autoplay next track",
    private: "Private Profile",
    bio: "Biography",
    city: "City",
    displayName: "Display Name",
    editProfile: "Edit Profile",
    recentPlayed: "Recently Played",
    likedTracks: "Liked Tracks",
    followedArtists: "Artists",
    savedPlaylists: "Playlists",
    createPlaylist: "Create Playlist",
    name: "Name",
    desc: "Description",
    public: "Public",
    resetPassword: "Reset Password",
    forgotPassword: "Forgot Password?",
    enterEmail: "Enter your email",
    sendCode: "Send Reset Code",
    enterCode: "Enter reset code",
    newPassword: "New Password",
    confirm: "Confirm",
    search_placeholder: "Search tracks, artists, albums...",
    popular_queries: "Popular queries",
    genres_explore: "Explore Genres",
    coming_soon: "Coming soon",
    support_team: "Contact Support Team",
    contact_text: "If you have any questions, feel free to contact us.",
    subject: "Subject",
    message: "Message",
    send: "Send",
    buy_ticket_title: "Purchase Concert Ticket",
    ticket_success: "Ticket purchased successfully! Check your email.",
    enter_phone: "Enter your phone number",
    enter_email: "Enter your email",
    loading: "Loading...",
    save_settings: "Save Settings"
  }
};

type LanguageKey = 'ru' | 'kk' | 'en';
type TranslationKey = keyof typeof translations.ru;

interface I18nContextType {
  locale: LanguageKey;
  setLocale: (lang: LanguageKey) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [locale, setLocaleState] = useState<LanguageKey>('ru');

  useEffect(() => {
    if (user?.settings?.language) {
      setLocaleState(user.settings.language as LanguageKey);
    }
  }, [user]);

  const setLocale = (lang: LanguageKey) => {
    setLocaleState(lang);
    if (user) {
      api.auth.updateSettings({ language: lang }).catch(() => {});
    }
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[locale] || translations.ru;
    return dict[key] || translations.en[key] || String(key);
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
