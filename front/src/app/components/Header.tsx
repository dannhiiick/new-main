import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Bell, Settings, User, LogOut, Search, Menu } from 'lucide-react';
import { useAuth } from './AuthContext';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Главная', subtitle: 'Подборки и релизы для вас' },
  '/search': { title: 'Поиск', subtitle: 'Найдите любимых артистов и треки' },
  '/tracks': { title: 'Треки', subtitle: 'Вся музыка платформы' },
  '/artists': { title: 'Артисты', subtitle: 'Исполнители и группы' },
  '/albums': { title: 'Альбомы', subtitle: 'Дискография и новинки' },
  '/playlists': { title: 'Плейлисты', subtitle: 'Редакторские и тематические подборки' },
  '/genres': { title: 'Жанры', subtitle: 'Музыка по настроению' },
  '/charts': { title: 'Чарты', subtitle: 'Популярное прямо сейчас' },
  '/events': { title: 'События', subtitle: 'Концерты и фестивали' },
  '/library': { title: 'Библиотека', subtitle: 'Ваша коллекция' },
  '/profile': { title: 'Профиль', subtitle: 'Ваши данные и активность' },
  '/settings': { title: 'Настройки', subtitle: 'Управление аккаунтом' },
  '/help': { title: 'Помощь', subtitle: 'Поддержка и документация' },
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const info = PAGE_TITLES[location.pathname] ?? { title: 'QMusic', subtitle: '' };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20 shrink-0"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-xl hover:bg-secondary text-foreground shrink-0 transition-colors"
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

        <button className="relative w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={16} />
          {user?.settings.notificationsEnabled && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
          )}
        </button>

        <Link
          to="/settings"
          className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings size={16} />
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={12} className="text-primary" />
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
                <User size={14} /> Мой профиль
              </Link>
              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Settings size={14} /> Настройки
              </Link>
              <hr className="my-1 border-border" />
              <button
                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-secondary transition-colors w-full text-left"
              >
                <LogOut size={14} /> Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
