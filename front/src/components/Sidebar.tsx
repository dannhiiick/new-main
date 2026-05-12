import { NavLink } from 'react-router-dom';
import { Home, Search, Users, Music, Disc3, ListMusic, Radio, TrendingUp, Calendar, Library, CircleHelp } from 'lucide-react';
import './Sidebar.css';

export function Sidebar() {
  const navItems = [
    { icon: Home, label: 'Главная', path: '/' },
    { icon: Search, label: 'Поиск', path: '/search' },
    { icon: Users, label: 'Артисты', path: '/artists' },
    { icon: Music, label: 'Треки', path: '/tracks' },
    { icon: Disc3, label: 'Альбомы', path: '/albums' },
    { icon: ListMusic, label: 'Плейлисты', path: '/playlists' },
    { icon: Radio, label: 'Жанры', path: '/genres' },
    { icon: TrendingUp, label: 'Чарты', path: '/charts' },
    { icon: Calendar, label: 'События', path: '/events' },
    { icon: Library, label: 'Библиотека', path: '/library' },
    { icon: CircleHelp, label: 'Помощь', path: '/help' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">Q</span>
          <span className="logo-text">QMusic</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={20} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="premium-banner">
          <div className="premium-text">
            <strong>Premium</strong>
            <small>Откройте все возможности</small>
          </div>
          <button className="premium-btn">Подключить</button>
        </div>
      </div>
    </aside>
  );
}
