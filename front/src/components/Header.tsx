import { Link, useNavigate } from 'react-router-dom';
import { Bell, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import './Header.css';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.displayName || user?.username || 'Профиль';

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">Музыкальная лента</h1>
        <p className="header-subtitle">Подборки, релизы и артисты на сегодня</p>
      </div>

      <div className="header-right">
        <div className="search-bar">
          <input type="text" placeholder="Искать артистов, треки и плейлисты..." />
          <span className="search-icon">⌕</span>
        </div>

        <button className="header-btn notifications" type="button" title="Уведомления">
          <Bell size={20} />
          <span className="badge">{user?.settings.notificationsEnabled ? '3' : '0'}</span>
        </button>

        <Link className="header-btn settings" to="/settings" title="Настройки">
          <Settings size={20} />
        </Link>

        <div className="user-menu">
          <Link className="user-btn" to="/profile">
            <User size={20} />
            <span>{displayName}</span>
          </Link>
          <div className="dropdown-menu">
            <Link to="/profile">Мой профиль</Link>
            <Link to="/settings">Настройки</Link>
            <Link to="/help">Помощь</Link>
            <hr />
            <button
              type="button"
              className="dropdown-action"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
