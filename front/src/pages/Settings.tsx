import { useEffect, useState } from 'react';
import { Bell, EyeOff, Gauge, Languages, MonitorCog, Play, Save } from 'lucide-react';
import { fetchSettings, updateSettings } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { UserSettings } from '../types';
import './Settings.css';

const languageLabels: Record<UserSettings['language'], string> = {
  ru: 'Русский',
  kk: 'Қазақша',
  en: 'English',
};

const themeLabels: Record<UserSettings['theme'], string> = {
  system: 'Как в системе',
  light: 'Светлая',
  dark: 'Темная',
};

const qualityLabels: Record<UserSettings['audioQuality'], string> = {
  auto: 'Авто',
  high: 'Высокое',
  saver: 'Экономия',
};

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(user?.settings ?? null);
  const [loading, setLoading] = useState(!user?.settings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchSettings();
        if (mounted) setSettings(data);
      } catch (err) {
        if (mounted) setError((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const patchLocal = (patch: Partial<UserSettings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const saved = await updateSettings(settings);
      setSettings(saved);
      await refreshUser();
      setStatus('Настройки сохранены');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="settings-page">
        <div className="settings-card">Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div>
          <h2>Настройки</h2>
          <p>Персональные параметры аккаунта, сохраненные на сервере.</p>
        </div>
      </section>

      <form className="settings-layout" onSubmit={onSubmit}>
        <section className="settings-card">
          <div className="settings-section-head">
            <Languages size={22} />
            <div>
              <h3>Язык</h3>
              <p>Выберите язык интерфейса.</p>
            </div>
          </div>
          <div className="segmented">
            {(['ru', 'kk', 'en'] as const).map((language) => (
              <button
                key={language}
                type="button"
                className={settings.language === language ? 'active' : ''}
                onClick={() => patchLocal({ language })}
              >
                {languageLabels[language]}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-head">
            <MonitorCog size={22} />
            <div>
              <h3>Оформление</h3>
              <p>Тема будет применяться к аккаунту.</p>
            </div>
          </div>
          <div className="settings-select-row">
            <select
              value={settings.theme}
              onChange={(e) => patchLocal({ theme: e.target.value as UserSettings['theme'] })}
            >
              {(['system', 'light', 'dark'] as const).map((theme) => (
                <option key={theme} value={theme}>
                  {themeLabels[theme]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-section-head">
            <Gauge size={22} />
            <div>
              <h3>Качество аудио</h3>
              <p>Баланс качества и скорости загрузки.</p>
            </div>
          </div>
          <div className="settings-select-row">
            <select
              value={settings.audioQuality}
              onChange={(e) => patchLocal({ audioQuality: e.target.value as UserSettings['audioQuality'] })}
            >
              {(['auto', 'high', 'saver'] as const).map((quality) => (
                <option key={quality} value={quality}>
                  {qualityLabels[quality]}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="settings-card toggles-card">
          <label className="settings-toggle">
            <span>
              <Play size={20} />
              Автоплей
            </span>
            <input
              type="checkbox"
              checked={settings.autoplay}
              onChange={(e) => patchLocal({ autoplay: e.target.checked })}
            />
          </label>

          <label className="settings-toggle">
            <span>
              <Bell size={20} />
              Уведомления
            </span>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => patchLocal({ notificationsEnabled: e.target.checked })}
            />
          </label>

          <label className="settings-toggle">
            <span>
              <EyeOff size={20} />
              Приватный профиль
            </span>
            <input
              type="checkbox"
              checked={settings.privateProfile}
              onChange={(e) => patchLocal({ privateProfile: e.target.checked })}
            />
          </label>
        </section>

        <section className="settings-card settings-save-card">
          <div>
            <h3>Сохранение</h3>
            <p>Изменения попадут в API и будут видны в профиле.</p>
          </div>
          {status ? <div className="settings-success">{status}</div> : null}
          {error ? <div className="settings-error">{error}</div> : null}
          <button className="settings-save" type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Сохраняем...' : 'Сохранить настройки'}
          </button>
        </section>
      </form>
    </div>
  );
}
