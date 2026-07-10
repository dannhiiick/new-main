import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Mail, Lock, ShieldAlert, KeyRound, ArrowLeft } from 'lucide-react';
import { api } from './api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<1 | 2>(1);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Пароль должен быть не менее 8 символов.';
    if (!/[A-Z]/.test(pass)) return 'Пароль должен содержать хотя бы одну заглавную букву (A-Z).';
    if (!/[a-z]/.test(pass)) return 'Пароль должен содержать хотя бы одну строчную букву (a-z).';
    if (!/[0-9]/.test(pass)) return 'Пароль должен содержать хотя бы одну цифру (0-9).';
    return null;
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);
    try {
      await api.auth.forgotPassword(email.trim());
      setSuccess('Код восстановления успешно отправлен на вашу почту.');
      setPhase(2);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Введите код восстановления.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(token.trim(), password);
      setSuccess('Пароль успешно сброшен. Перенаправление на страницу входа...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Не удалось сбросить пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="min-h-screen flex items-center justify-center p-6 bg-[#0C0C14] text-[#F0EFF8] relative overflow-hidden"
    >
      {/* Decorative gradient backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#13131F] border border-white/5 rounded-2xl p-8 shadow-2xl z-10 relative">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Назад к авторизации
        </Link>

        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <KeyRound size={22} className="fill-primary/20" />
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Восстановление доступа
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            {phase === 1
              ? 'Введите email, чтобы получить одноразовый код сброса пароля.'
              : 'Введите полученный код и новый безопасный пароль.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400">
            {success}
          </div>
        )}

        {phase === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10.5 pr-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Отправка...' : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Код восстановления</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Например: 573BA17B"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Новый пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10.5 pr-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Подтвердите пароль</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10.5 pr-4 py-2.5 rounded-xl bg-[#1A1A2A] border border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Сброс пароля...' : 'Подтвердить новый пароль'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
