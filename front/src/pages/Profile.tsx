import { useEffect, useState } from 'react';
import { CheckCircle2, LogOut, Save, Shield, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Profile.css';

export function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [city, setCity] = useState(user?.city || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setDisplayName(user?.displayName || '');
    setCity(user?.city || '');
    setBio(user?.bio || '');
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setSaving(true);

    try {
      await updateProfile({
        username,
        email,
        display_name: displayName,
        city,
        bio,
      });
      setStatus('Профиль сохранен');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">{(displayName || username).slice(0, 2).toUpperCase()}</div>
        <div>
          <h2>{displayName || username}</h2>
          <p>{bio || 'Заполните профиль, чтобы он выглядел живым в MoodStream.'}</p>
        </div>
      </section>

      <div className="profile-layout">
        <form className="profile-card" onSubmit={onSubmit}>
          <div className="profile-head">
            <div>
              <div className="profile-title">Мой профиль</div>
              <div className="profile-subtitle">Эти данные сохраняются в Django API</div>
            </div>
            <UserRound size={24} />
          </div>

          <div className="profile-form-grid">
            <label className="profile-field">
              <span>Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>

            <label className="profile-field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </label>

            <label className="profile-field">
              <span>Имя на сайте</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>

            <label className="profile-field">
              <span>Город</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </div>

          <label className="profile-field">
            <span>О себе</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </label>

          {status ? <div className="profile-success">{status}</div> : null}
          {error ? <div className="profile-error">{error}</div> : null}

          <div className="profile-actions">
            <button className="profile-primary" type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              className="profile-secondary"
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </form>

        <aside className="profile-card profile-summary">
          <div className="profile-head">
            <div>
              <div className="profile-title">Аккаунт</div>
              <div className="profile-subtitle">Состояние и быстрые данные</div>
            </div>
            <Shield size={24} />
          </div>

          <div className="profile-grid">
            <div className="profile-item">
              <b>ID</b>
              <span>{user.id}</span>
            </div>
            <div className="profile-item">
              <b>Роль</b>
              <span>{user.isStaff ? 'Админ' : 'Слушатель'}</span>
            </div>
            <div className="profile-item">
              <b>Приватность</b>
              <span>{user.settings.privateProfile ? 'Приватный' : 'Открытый'}</span>
            </div>
            <div className="profile-item">
              <b>Уведомления</b>
              <span>{user.settings.notificationsEnabled ? 'Включены' : 'Выключены'}</span>
            </div>
          </div>

          <div className="profile-verified">
            <CheckCircle2 size={18} />
            Авторизация работает через JWT
          </div>
        </aside>
      </div>
    </div>
  );
}
