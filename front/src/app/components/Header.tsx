import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Bell, Settings, User, LogOut, Search, Menu, Check } from 'lucide-react';
import { useAuth } from './AuthContext';
import { api } from './api';
import { useTranslation } from './i18n';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Главная', subtitle: 'Подборки и релизы для вас' },
  '/search': { title: 'Поиск', subtitle: 'Найдите любимых артистов и треки' },
  '/tracks': { title: 'Треки', subtitle: 'Вся музыка платформы' },
  '/artists': { title: 'Артисты', subtitle: 'Исполнители и группы' },
  '/albums': { title: 'Альбомы', subtitle: 'Дискография и новинки' },
  '/playlists': { title: 'Плейлисты', subtitle: 'Редакторские и thematic подборки' },
  '/genres': { title: 'Жанры', subtitle: 'Музыка по настроению' },
  '/charts': { title: 'Чарты', subtitle: 'Популярное прямо сейчас' },
  '/events': { title: 'События', subtitle: 'Концерты и фестивали' },
  '/library': { title: 'Библиотека', subtitle: 'Ваша коллекция' },
  '/profile': { title: 'Профиль', subtitle: 'Ваши данные и активность' },
  '/settings': { title: 'Настройки', subtitle: 'Управление аккаунтом' },
  '/help': { title: 'Помощь', subtitle: 'Поддержка и документация' },
  '/premium': { title: 'Premium', subtitle: 'Тарифные планы платформы' },
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [query, setQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const info = PAGE_TITLES[location.pathname] ?? { title: 'QMusic', subtitle: '' };

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const data = await api.notifications.get();
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener to close dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notifOpen, menuOpen]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <header
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border bg-background/85 backdrop-blur-md sticky top-0 z-20 shrink-0"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-xl hover:bg-secondary text-foreground shrink-0 transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em' }} className="text-foreground leading-tight md:text-xl">
            {info.title}
          </h1>
          {info.subtitle && (
            <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 hidden sm:block">{info.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Поиск..."
            className="pl-9 pr-4 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring w-52 transition-all"
          />
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-[9px] text-white flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-popover border border-border shadow-xl py-1 z-50 overflow-hidden">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-secondary/15">
                <span className="text-xs font-semibold text-foreground">{t('notifications')}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                  >
                    <Check size={10} /> {t('mark_all_read')}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className={`px-4 py-2.5 flex flex-col gap-0.5 text-left text-xs ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate">{n.title}</span>
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-muted-foreground leading-normal">{n.body}</p>
                      <span className="text-[9px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString('ru', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {t('no_notifications')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Link
          to="/settings"
          className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings size={16} />
        </Link>

        {/* User Account Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border hover:border-primary/40 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <User size={12} className="text-primary" />
              )}
            </div>
            <span className="text-sm text-foreground max-w-[100px] truncate hidden sm:inline">
              {user?.displayName || user?.username}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-popover border border-border shadow-xl py-1 z-50">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <User size={14} /> {t('profile')}
              </Link>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Settings size={14} /> {t('settings')}
              </Link>
              <hr className="my-1 border-border" />
              <button
                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors w-full text-left cursor-pointer"
              >
                <LogOut size={14} /> {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
