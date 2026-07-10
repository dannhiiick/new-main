import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api, type UserSettings } from './api';
import { useTranslation } from './i18n';
import { Globe, Palette, Volume2, Shield } from 'lucide-react';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-switch-background'}`}
      style={{ height: '1.375rem', cursor: 'pointer' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform"
        style={{
          width: '1.125rem', height: '1.125rem',
          transform: checked ? 'translateX(1.375rem)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { t, setLocale } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>({
    language: 'ru',
    theme: 'system',
    audioQuality: 'auto',
    autoplay: true,
    notificationsEnabled: true,
    privateProfile: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.settings) {
      setSettings(user.settings);
    }
  }, [user]);

  const update = (patch: Partial<UserSettings>) => {
    setSettings(s => ({ ...s, ...patch }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.auth.updateSettings(settings);
      // Sync local translation state if language was changed
      setLocale(settings.language);
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-lg flex flex-col gap-5">
        
        {/* Language selector */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-border bg-secondary/10 flex items-center gap-2">
            <Globe size={15} className="text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('lang')}</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('lang')}</p>
            </div>
            <select
              value={settings.language}
              onChange={e => update({ language: e.target.value as UserSettings['language'] })}
              className="px-3 py-1.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        {/* Theme selector */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-border bg-secondary/10 flex items-center gap-2">
            <Palette size={15} className="text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('theme')}</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('theme')}</p>
            </div>
            <select
              value={settings.theme}
              onChange={e => update({ theme: e.target.value as UserSettings['theme'] })}
              className="px-3 py-1.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="light">{t('theme_light')}</option>
              <option value="dark">{t('theme_dark')}</option>
              <option value="system">{t('theme_system')}</option>
            </select>
          </div>
        </div>

        {/* Audio settings */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-border bg-secondary/10 flex items-center gap-2">
            <Volume2 size={15} className="text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Звук</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('quality')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Влияет на потребление трафика</p>
            </div>
            <select
              value={settings.audioQuality}
              onChange={e => update({ audioQuality: e.target.value as UserSettings['audioQuality'] })}
              className="px-3 py-1.5 rounded-xl bg-input-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="auto">Автоматически</option>
              <option value="high">Высокое (Hi-Fi)</option>
              <option value="saver">Экономия данных</option>
            </select>
          </div>
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('autoplay')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Переход к следующему треку</p>
            </div>
            <Toggle checked={settings.autoplay} onChange={v => update({ autoplay: v })} />
          </div>
        </div>

        {/* Confidentiality and notifications */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-border bg-secondary/10 flex items-center gap-2">
            <Shield size={15} className="text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('private')}</p>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('notifications')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Получать оповещения платформы</p>
            </div>
            <Toggle checked={settings.notificationsEnabled} onChange={v => update({ notificationsEnabled: v })} />
          </div>
          <div className="px-5 py-4 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{t('private')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Скрыть профиль от посторонних глаз</p>
            </div>
            <Toggle checked={settings.privateProfile} onChange={v => update({ privateProfile: v })} />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 cursor-pointer self-start"
        >
          {saving ? t('saving') : saved ? t('saved') : t('save_settings')}
        </button>
      </div>
    </div>
  );
}
