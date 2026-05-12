import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Register.css';
import '../styles/AuthLayout.css';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        username,
        email: email || undefined,
        password,
      });
      navigate('/');
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
    <div className="auth-page register-page">
      <div className="auth-card">
        <div>
          <h2 className="auth-title">Регистрация</h2>
          <div className="auth-subtitle">Создайте аккаунт за пару секунд</div>
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
            <span className="auth-label">Email (optional)</span>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              type="email"
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
              {submitting ? 'Создаем...' : 'Создать аккаунт'}
            </button>
            {error ? <div className="auth-error">{error}</div> : null}
          </div>
        </form>

        <div className="auth-footer">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="login-small">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
