import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  Home, Search, Users, Music2, Disc3, ListMusic,
  Radio, TrendingUp, Calendar, Library, HelpCircle, Zap
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { ComingSoonModal } from './ComingSoonModal';

const NAV = [
  { icon: Home, label: 'Главная', path: '/' },
  { icon: Search, label: 'Поиск', path: '/search' },
  { icon: Music2, label: 'Треки', path: '/tracks' },
  { icon: Users, label: 'Артисты', path: '/artists' },
  { icon: Disc3, label: 'Альбомы', path: '/albums' },
  { icon: ListMusic, label: 'Плейлисты', path: '/playlists' },
  { icon: Radio, label: 'Жанры', path: '/genres' },
  { icon: TrendingUp, label: 'Чарты', path: '/charts' },
  { icon: Calendar, label: 'События', path: '/events' },
  { icon: Library, label: 'Библиотека', path: '/library' },
  { icon: HelpCircle, label: 'Помощь', path: '/help' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const [premiumOpen, setPremiumOpen] = useState(false);

  return (
    <>
      {/* Backdrop for mobile drawer */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        style={{ fontFamily: "'Inter', sans-serif" }}
        className={`flex flex-col w-[220px] shrink-0 bg-sidebar border-r border-sidebar-border h-full overflow-y-auto fixed top-0 bottom-0 left-0 z-50 transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white fill-white" />
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }} className="text-foreground">
          QMusic
        </span>
      </div>

      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {NAV.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-primary' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 p-4">
          <p className="text-xs text-muted-foreground mb-1">Добро пожаловать</p>
          <p className="text-sm font-medium text-foreground truncate">{user?.displayName || user?.username}</p>
          <button
            onClick={() => setPremiumOpen(true)}
            className="mt-3 w-full py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Premium
          </button>
        </div>
      </div>

      <ComingSoonModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        title="Premium-подписка скоро"
        description="Тарифы, оплата и эксклюзивные плейлисты для Premium-пользователей сейчас в разработке. Следите за обновлениями!"
      />
      </aside>
    </>
  );
}
