import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Login.css';
import '../styles/AuthLayout.css';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-page login-page">
      <div className="auth-card">
        <div>
          <h2 className="auth-title">Вход</h2>
          <div className="auth-subtitle">Введите логин и пароль</div>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field">
            <span className="auth-label">Username</span>
            <input
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              required
            />
          </label>

          <div className="auth-actions">
            <button className="auth-primary-btn" type="submit">
              {submitting ? 'Входим...' : 'Войти'}
            </button>
            {error ? <div className="auth-error">{error}</div> : null}
          </div>
        </form>

        <div className="auth-footer">
          Нет аккаунта?{' '}
          <Link to="/register" className="login-small">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}
